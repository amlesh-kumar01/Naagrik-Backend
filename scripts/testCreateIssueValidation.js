const { validationResult } = require('express-validator');
const { createIssueValidation } = require('../middleware/validation');

// Simulate Express.js req/res objects
function mockRequest(body) {
  return { body };
}

async function testCreateIssueValidation(payload) {
  // Simulate Express middleware chain
  const req = mockRequest(payload);
  const res = {};
  const next = () => {};

  // Run all validators
  for (const validator of createIssueValidation) {
    await validator.run(req, res, next);
  }

  // Get validation result
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    console.log('✅ Validation passed!');
  } else {
    console.log('❌ Validation failed:');
    errors.array().forEach(err => {
      console.log(`- [${err.param}] ${err.msg} (value: ${err.value})`);
    });
  }
}

// Example payloads
const validPayload = {
  title: 'Broken Streetlight',
  description: 'The streetlight is not working at night.',
  categoryId: 1,
  locationLat: 28.6139,
  locationLng: 77.2090,
  address: 'Main Street, New Delhi'
};

const validPayloadWithoutLocation = {
  title: 'Broken Streetlight',
  description: 'The streetlight is not working at night.',
  categoryId: 1,
  address: 'Main Street, New Delhi'
};

const invalidPayload = {
  title: '',
  description: '',
  categoryId: '',
  locationLat: '',
  locationLng: ''
};

// Test with valid payload
console.log('Testing valid payload with location:');
testCreateIssueValidation(validPayload).then(() => {
  console.log('\nTesting valid payload without location:');
  return testCreateIssueValidation(validPayloadWithoutLocation);
}).then(() => {
  // Test with invalid payload
  console.log('\nTesting invalid payload:');
  testCreateIssueValidation(invalidPayload);
});