// api/jest.teardown.js
module.exports = async () => {
  // Give any pending async operations a moment to complete
  await new Promise(resolve => setTimeout(resolve, 500));
};