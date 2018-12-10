const uuid = require('uuid/v4');

const AWS = require('aws-sdk');

const elasticachePoller = require('./poller');

const sns = new AWS.SNS();

const dynamodb = new AWS.DynamoDB.DocumentClient();

elasticachePoller.configure(process.env.REDIS_CLUSTER_URI, process.env.REDIS_CLUSTER_PORT, 128, 32);

// const checkReviewStatus = eventStatus => (console.log(JSON.stringify({ eventStatus })), eventStatus && eventStatus.review_saved && (eventStatus.review_saved.status === 'ok' || eventStatus.review_saved.status === 'error'));

const checkReviewStatus = eventStatus => (eventStatus && eventStatus.review_saved && (eventStatus.review_saved.status === 'ok' || eventStatus.review_saved.status === 'error'));

const getOkResponse = review => ({
  statusCode: 200,
  body: JSON.stringify({
    message: `Thank you ${review.author}, your review has been succesfully registered!`,
    review,
  }),
});

const addReview = async ({ body }) => {
  const { author, reviewText } = JSON.parse(body);
  console.log({ author, reviewText });
  const review = {
    author,
    reviewText,
  };

  const correlationId = uuid();
  const eventId = uuid();

  const snsEvent = {
    correlationId,
    eventId,
    eventType: 'add_review',
    body: review,
  };

  const reviewSnsParams = {
    TopicArn: process.env.REVIEW_SNS_TOPIC_ARN,
    Message: JSON.stringify(snsEvent),
  };

  try {
    await sns.publish(reviewSnsParams).promise();
    const { object } = await elasticachePoller.pollValue(correlationId, 'review_saved', checkReviewStatus);
    const { review_saved: { status, review, error } } = JSON.parse(object);
    if (status === 'error') throw new Error(error);
    console.log(JSON.stringify({ status, review, error }));
    return getOkResponse(review);
  } catch(e) {
    console.log(e.toString());
    return { statusCode: 400, body: JSON.stringify({ error: e.toString() }) };
  }
};

saveReview = async ({ Records: [{ Sns: sns },] }) => {
  console.log(JSON.stringify(sns));
  const eventData = JSON.parse(sns.Message);
  const { correlationId, eventType, body } = eventData;

  const review = { ...body, id: uuid(), createdTimestamp: new Date().getTime() };

  try {
    await dynamodb.put({
      TableName: process.env.REVIEW_TABLE,
      Item: review,
    }).promise();
  
    const statusSet = await elasticachePoller.setValue(correlationId, 'review_saved', { review, status: 'ok' });
    console.log(JSON.stringify({ statusSet }));
  } catch(e) {
    console.log(e.toString());
    await elasticachePoller.setValue(correlationId, 'review_saved', { error: e.toString(), status: 'error' });
  }
};

sendThankYouEmail = async ({ Records: [{ Sns: sns },] }) => {
  console.log(JSON.stringify(sns));
  const eventData = JSON.parse(sns.Message);
  const { correlationId, eventType, body } = eventData;

  try {
    console.log('Sorry, not implemented yet 🤭 ...');
  
    const statusSet = await elasticachePoller.setValue(correlationId, 'email_sent', { status: 'ok' });
    console.log(JSON.stringify({ statusSet }));
  } catch(e) {
    console.log(e.toString());
    await elasticachePoller.setValue(correlationId, 'email_sent', { error: e.toString(), status: 'error' });
  }
};

updateUserProfile = async ({ Records: [{ Sns: sns },] }) => {
  console.log('Sorry, not implemented yet 🤭 ...');
};

module.exports = {
  addReview,
  saveReview,
  sendThankYouEmail,
  updateUserProfile,
};
