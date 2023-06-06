// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto'); // To generate random Ids
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments array
const commentsByPostId = {};

// Get all comments for a post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create a new comment
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = randomBytes(4).toString('hex');
  // Get the content of the comment from the request body
  const { content } = req.body;
  // Get the comments for the specified post
  const comments = commentsByPostId[req.params.id] || [];
  // Add the comment to the array
  comments.push({ id: commentId, content, status: 'pending' });
  // Update the comments array
  commentsByPostId[req.params.id] = comments;
  // Send the comment to the event bus
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });
  // Send the comment back to the client
  res.status(201).send(comments);
});

// Receive events from the event bus
app.post('/events', async (req, res) => {
  console.log('Event Received:', req.body.type);
  const { type, data } = req.body;
  // If the event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get the comments for the specified post
    const comments = commentsByPostId[data.postId];
    // Get the comment with the specified id
    const comment = comments.find(comment => {
      return comment.id === data.id;
    });
    // Update the status of the comment
    comment.status = data.status;
    // Send the comment to the event bus
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        content: data.content,
        postId: data.postId,
        status: data.status
      }
    });
}
});