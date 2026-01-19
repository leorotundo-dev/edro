/**
 * Load Testing Script using k6
 * 
 * Installation:
 * - Windows: choco install k6
 * - Mac: brew install k6
 * - Linux: See https://k6.io/docs/getting-started/installation/
 * 
 * Run:
 * k6 run tests/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const responseTime = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    errors: ['rate<0.05'],
    success: ['rate>0.95'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';

// Test scenarios
export default function () {
  // Scenario 1: Health check
  testHealthCheck();
  
  // Scenario 2: Public endpoints
  testPublicEndpoints();
  
  // Scenario 3: Auth flow
  testAuthFlow();
  
  sleep(1);
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  
  const success = check(res, {
    'health check status 200': (r) => r.status === 200,
    'health check has status': (r) => r.json('status') === 'ok',
  });
  
  errorRate.add(!success);
  successRate.add(success);
  responseTime.add(res.timings.duration);
}

function testPublicEndpoints() {
  // Test /api/plans
  const plansRes = http.get(`${BASE_URL}/api/plans`);
  
  check(plansRes, {
    'plans status 200': (r) => r.status === 200,
    'plans has data': (r) => r.json('data') !== undefined,
  });
  
  responseTime.add(plansRes.timings.duration);
  
  // Test /api/disciplines
  const disciplinesRes = http.get(`${BASE_URL}/api/disciplines`);
  
  check(disciplinesRes, {
    'disciplines status 200': (r) => r.status === 200,
  });
  
  responseTime.add(disciplinesRes.timings.duration);
}

function testAuthFlow() {
  // Register (will fail after first time, that's ok)
  const registerPayload = JSON.stringify({
    email: `loadtest${Date.now()}@test.com`,
    password: 'TestPass123!',
    fullName: 'Load Test User',
  });
  
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    registerPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(registerRes, {
    'register status 200 or 409': (r) => r.status === 200 || r.status === 409,
  });
  
  // Login
  const loginPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  });
  
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const loginSuccess = check(loginRes, {
    'login has response': (r) => r.status === 200 || r.status === 401,
  });
  
  responseTime.add(loginRes.timings.duration);
}

// Summary handler
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let summary = '\n' + indent + '=== Load Test Summary ===\n\n';
  
  // Extract key metrics
  const metrics = data.metrics;
  
  if (metrics.http_req_duration) {
    summary += indent + 'Response Time:\n';
    summary += indent + `  avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += indent + `  min: ${metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
    summary += indent + `  max: ${metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
    summary += indent + `  p(95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += '\n';
  }
  
  if (metrics.http_reqs) {
    summary += indent + 'Requests:\n';
    summary += indent + `  total: ${metrics.http_reqs.values.count}\n`;
    summary += indent + `  rate: ${metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
    summary += '\n';
  }
  
  if (metrics.http_req_failed) {
    summary += indent + 'Success Rate:\n';
    summary += indent + `  failed: ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
    summary += indent + `  success: ${((1 - metrics.http_req_failed.values.rate) * 100).toFixed(2)}%\n`;
    summary += '\n';
  }
  
  summary += indent + '=========================\n';
  
  return summary;
}
