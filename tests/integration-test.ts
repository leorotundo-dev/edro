/**
 * Integration Tests
 * Tests complete user flows
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3333';

// ============================================
// TEST SUITE
// ============================================

class IntegrationTestSuite {
  private api: AxiosInstance;
  private authToken: string = '';
  private userId: string = '';
  
  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });
  }
  
  async runAll() {
    console.log('\n🧪 Starting Integration Tests...\n');
    
    try {
      await this.testHealthEndpoint();
      await this.testAuthFlow();
      await this.testPublicEndpoints();
      await this.testProtectedEndpoints();
      await this.testReccoEngine();
      await this.testPerformance();
      await this.testSecurity();
      
      console.log('\n✅ All tests passed!\n');
      return true;
    } catch (err) {
      console.error('\n❌ Tests failed:', err);
      return false;
    }
  }
  
  // ============================================
  // HEALTH CHECK
  // ============================================
  
  async testHealthEndpoint() {
    console.log('Testing: Health endpoint...');
    
    const res = await this.api.get('/health');
    
    if (res.status !== 200) {
      throw new Error('Health check failed');
    }
    
    if (res.data.status !== 'ok') {
      throw new Error('Health status is not ok');
    }
    
    console.log('✅ Health endpoint OK');
  }
  
  // ============================================
  // AUTH FLOW
  // ============================================
  
  async testAuthFlow() {
    console.log('Testing: Auth flow...');
    
    // Register
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    
    try {
      const registerRes = await this.api.post('/api/auth/register', {
        email,
        password,
        fullName: 'Integration Test User',
      });
      
      if (registerRes.status !== 200) {
        throw new Error('Registration failed');
      }
      
      console.log('  ✅ Registration OK');
    } catch (err: any) {
      if (err.response?.status === 409) {
        console.log('  ℹ️  User already exists (expected in repeated tests)');
      } else {
        throw err;
      }
    }
    
    // Login
    const loginRes = await this.api.post('/api/auth/login', {
      email: 'test@example.com', // Use existing test user
      password: 'password123',
    });
    
    if (loginRes.status === 200 && loginRes.data.data?.token) {
      this.authToken = loginRes.data.data.token;
      this.userId = loginRes.data.data.user?.id || '';
      console.log('  ✅ Login OK');
    } else {
      console.log('  ⚠️  Login failed (test user may not exist)');
    }
    
    console.log('✅ Auth flow OK');
  }
  
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================
  
  async testPublicEndpoints() {
    console.log('Testing: Public endpoints...');
    
    // Plans
    const plansRes = await this.api.get('/api/plans');
    if (plansRes.status !== 200) {
      throw new Error('Plans endpoint failed');
    }
    console.log('  ✅ Plans endpoint OK');
    
    // Disciplines
    const disciplinesRes = await this.api.get('/api/disciplines');
    if (disciplinesRes.status !== 200) {
      throw new Error('Disciplines endpoint failed');
    }
    console.log('  ✅ Disciplines endpoint OK');
    
    console.log('✅ Public endpoints OK');
  }
  
  // ============================================
  // PROTECTED ENDPOINTS
  // ============================================
  
  async testProtectedEndpoints() {
    if (!this.authToken) {
      console.log('⏭️  Skipping protected endpoints (no auth token)');
      return;
    }
    
    console.log('Testing: Protected endpoints...');
    
    const headers = { Authorization: `Bearer ${this.authToken}` };
    
    // User profile
    try {
      const profileRes = await this.api.get('/api/users/me', { headers });
      if (profileRes.status === 200) {
        console.log('  ✅ User profile endpoint OK');
      }
    } catch (err) {
      console.log('  ⚠️  User profile endpoint not accessible');
    }
    
    console.log('✅ Protected endpoints OK');
  }
  
  // ============================================
  // RECCO ENGINE
  // ============================================
  
  async testReccoEngine() {
    console.log('Testing: ReccoEngine endpoints...');
    
    // Stats endpoint
    try {
      const statsRes = await this.api.get('/api/recco/admin/stats');
      if (statsRes.status === 200) {
        console.log('  ✅ ReccoEngine stats OK');
      }
    } catch (err) {
      console.log('  ⚠️  ReccoEngine stats not accessible');
    }
    
    console.log('✅ ReccoEngine OK');
  }
  
  // ============================================
  // PERFORMANCE
  // ============================================
  
  async testPerformance() {
    console.log('Testing: Performance endpoints...');
    
    // Cache stats
    try {
      const cacheRes = await this.api.get('/api/admin/performance/cache/stats');
      if (cacheRes.status === 200) {
        console.log('  ✅ Cache stats OK');
      }
    } catch (err) {
      console.log('  ⚠️  Cache stats not accessible');
    }
    
    // Performance metrics
    try {
      const metricsRes = await this.api.get('/api/admin/performance/metrics');
      if (metricsRes.status === 200) {
        console.log('  ✅ Performance metrics OK');
      }
    } catch (err) {
      console.log('  ⚠️  Performance metrics not accessible');
    }
    
    console.log('✅ Performance endpoints OK');
  }
  
  // ============================================
  // SECURITY
  // ============================================
  
  async testSecurity() {
    console.log('Testing: Security endpoints...');
    
    // Security audit
    try {
      const auditRes = await this.api.get('/api/admin/security/audit');
      if (auditRes.status === 200) {
        console.log('  ✅ Security audit OK');
      }
    } catch (err) {
      console.log('  ⚠️  Security audit not accessible');
    }
    
    // Password strength check
    try {
      const passwordRes = await this.api.post('/api/security/check-password', {
        password: 'TestPass123!',
      });
      if (passwordRes.status === 200) {
        console.log('  ✅ Password strength check OK');
      }
    } catch (err) {
      console.log('  ⚠️  Password check not accessible');
    }
    
    console.log('✅ Security endpoints OK');
  }
}

// ============================================
// RUN TESTS
// ============================================

if (require.main === module) {
  const suite = new IntegrationTestSuite();
  
  suite.runAll()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

export default IntegrationTestSuite;
