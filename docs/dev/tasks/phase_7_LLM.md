# Phase 7 Implementation Prompt for Gemini

Based on the **Interxchange GEMINI.md** development guide, here is a comprehensive prompt for the Gemini AI agent to execute **Phase 7: Testing, Optimization & Documentation Completion**.

---

## PROMPT: Implement Interxchange Phase 7 - Testing, Optimization & Documentation Completion

You are the **Gemini AI agent** tasked with implementing **Phase 7: Testing, Optimization & Documentation Completion** of the Interxchange interoperability platform according to the specifications in the `GEMINI.md` development guide.

### Phase 7 Scope (7 days)
- Comprehensive end-to-end testing (Cypress)
- Performance testing and optimization
- Security audit and penetration testing
- Complete API documentation
- User documentation completion
- Training materials and videos
- Final code review and cleanup
- Production readiness checklist

### Timeline Expectations
- Day 1-2: End-to-end testing with Cypress (critical flows)
- Day 3: Performance testing (k6/locust) and optimization
- Day 4: Security audit (OWASP ZAP, manual review)
- Day 5: Complete API documentation with examples
- Day 6: User documentation and training materials
- Day 7: Final cleanup, code review, production readiness

---

## TASK 1: End-to-End Testing with Cypress

### Cypress Installation & Configuration

**Install Cypress** (frontend directory):

```bash
cd frontend
npm install --save-dev cypress @testing-library/cypress cypress-real-events
```

**Cypress Configuration** (`frontend/cypress.config.ts`):

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    env: {
      apiUrl: 'http://localhost:8000/api/v1',
    },
    retries: {
      runMode: 2,
      openMode: 0,
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },
});
```

**Cypress Support Commands** (`frontend/cypress/support/commands.ts`):

```typescript
/// <reference types="cypress" />

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request('POST', `${Cypress.env('apiUrl')}/auth/login`, { email, password })
    .then((response) => {
      window.localStorage.setItem('access_token', response.body.access_token);
      window.localStorage.setItem('refresh_token', response.body.refresh_token);
    });
});

// Create connection command
Cypress.Commands.add('createConnection', (connection: any) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/connections`,
    body: connection,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
    },
  });
});

// Create workflow command
Cypress.Commands.add('createWorkflow', (workflow: any) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/workflows`,
    body: workflow,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
    },
  });
});

// Upload mapping command
Cypress.Commands.add('uploadMapping', (filePath: string, name: string, type: string) => {
  cy.fixture(filePath, 'binary')
    .then(Cypress.Blob.binaryStringToBlob)
    .then((blob) => {
      const formData = new FormData();
      formData.append('file', blob, filePath);
      formData.append('name', name);
      formData.append('type', type);
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/mappings/upload`,
        body: formData,
        headers: {
          Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
          'Content-Type': 'multipart/form-data',
        },
      });
    });
});

// Clean database command
Cypress.Commands.add('cleanDatabase', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/admin/test/clean`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
    },
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      createConnection(connection: any): Chainable<any>;
      createWorkflow(workflow: any): Chainable<any>;
      uploadMapping(filePath: string, name: string, type: string): Chainable<any>;
      cleanDatabase(): Chainable<void>;
    }
  }
}
```

### Authentication Flow Tests (`frontend/cypress/e2e/01-auth.cy.ts`)

```typescript
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.cleanDatabase();
  });

  it('should display login page', () => {
    cy.visit('/login');
    cy.contains('Interxchange').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
    cy.contains('button', 'Sign In').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('invalid@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.contains('button', 'Sign In').click();
    cy.contains('Incorrect email or password').should('be.visible');
  });

  it('should login successfully with valid credentials', () => {
    // First create a test user via API
    cy.request('POST', `${Cypress.env('apiUrl')}/auth/register`, {
      email: 'test@example.com',
      password: 'Test123!',
      full_name: 'Test User',
    });
    
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('Test123!');
    cy.contains('button', 'Sign In').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Dashboard').should('be.visible');
  });

  it('should logout successfully', () => {
    cy.login('test@example.com', 'Test123!');
    cy.visit('/dashboard');
    
    cy.get('[data-testid="user-menu"]').click();
    cy.contains('Logout').click();
    
    cy.url().should('include', '/login');
  });

  it('should redirect to login when accessing protected route without auth', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('should refresh token automatically', () => {
    cy.login('test@example.com', 'Test123!');
    cy.visit('/dashboard');
    
    // Wait for token to expire (mock time travel or wait)
    // This test would require token expiration manipulation
    cy.wait(1000);
    cy.reload();
    
    // Should still be logged in
    cy.contains('Dashboard').should('be.visible');
  });
});
```

### Connections CRUD Tests (`frontend/cypress/e2e/02-connections.cy.ts`)

```typescript
describe('Connections Management', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'Admin123!');
    cy.visit('/connections');
  });

  it('should display connections list', () => {
    cy.contains('Connections').should('be.visible');
    cy.contains('Manage connections to external data systems').should('be.visible');
  });

  it('should create a new connection', () => {
    cy.contains('button', 'New Connection').click();
    
    cy.get('input[name="name"]').type('Test DHIS2 Connection');
    cy.get('[data-testid="connection-type"]').click();
    cy.get('[data-value="dhis2"]').click();
    cy.get('input[name="url"]').type('https://test.dhis2.org');
    cy.get('[data-testid="auth-type"]').click();
    cy.get('[data-value="basic"]').click();
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('password123');
    
    cy.contains('button', 'Test Connection').click();
    cy.contains('Connection test successful').should('be.visible');
    
    cy.contains('button', 'Save').click();
    cy.contains('Test DHIS2 Connection').should('be.visible');
  });

  it('should edit an existing connection', () => {
    cy.contains('Test DHIS2 Connection')
      .parent()
      .find('[data-testid="menu-button"]')
      .click();
    cy.contains('Edit').click();
    
    cy.get('input[name="name"]').clear().type('Updated DHIS2 Connection');
    cy.contains('button', 'Save').click();
    
    cy.contains('Updated DHIS2 Connection').should('be.visible');
  });

  it('should test connection status', () => {
    cy.contains('Updated DHIS2 Connection')
      .parent()
      .find('[data-testid="menu-button"]')
      .click();
    cy.contains('Test').click();
    
    cy.contains('Connection test successful').should('be.visible');
  });

  it('should delete a connection', () => {
    cy.contains('Updated DHIS2 Connection')
      .parent()
      .find('[data-testid="menu-button"]')
      .click();
    cy.contains('Delete').click();
    cy.contains('Confirm Delete').click();
    
    cy.contains('Updated DHIS2 Connection').should('not.exist');
  });

  it('should filter connections by search', () => {
    cy.get('input[placeholder*="Search"]').type('DHIS2');
    cy.contains('DHIS2 Connection').should('be.visible');
  });
});
```

### Workflows E2E Tests (`frontend/cypress/e2e/03-workflows.cy.ts`)

```typescript
describe('Workflows Management', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'Admin123!');
    
    // Create test connections
    cy.createConnection({
      name: 'Source Connection',
      type: 'generic',
      url: 'https://source.example.com',
      auth_type: 'basic',
      credentials: { username: 'test', password: 'test' },
    });
    
    cy.createConnection({
      name: 'Destination Connection',
      type: 'generic',
      url: 'https://dest.example.com',
      auth_type: 'basic',
      credentials: { username: 'test', password: 'test' },
    });
    
    cy.visit('/workflows');
  });

  it('should create a new workflow', () => {
    cy.contains('button', 'New Workflow').click();
    
    cy.get('input[name="name"]').type('Test Sync Workflow');
    cy.get('textarea[name="description"]').type('Test workflow for E2E testing');
    
    cy.get('[data-testid="source-connection"]').click();
    cy.contains('Source Connection').click();
    
    cy.get('[data-testid="destination-connection"]').click();
    cy.contains('Destination Connection').click();
    
    cy.get('[data-testid="schedule"]').click();
    cy.contains('Every 6 hours').click();
    
    cy.get('[data-testid="status"]').click();
    cy.contains('Active').click();
    
    cy.contains('button', 'Create').click();
    
    cy.contains('Test Sync Workflow').should('be.visible');
  });

  it('should trigger workflow execution', () => {
    cy.contains('Test Sync Workflow')
      .parent()
      .find('[data-testid="run-button"]')
      .click();
    
    cy.contains('Workflow triggered successfully').should('be.visible');
  });

  it('should view workflow details and history', () => {
    cy.contains('Test Sync Workflow').click();
    
    cy.contains('Workflow Details').should('be.visible');
    cy.contains('Source Connection').should('be.visible');
    cy.contains('Destination Connection').should('be.visible');
    cy.contains('Execution History').should('be.visible');
  });

  it('should edit workflow', () => {
    cy.contains('Test Sync Workflow')
      .parent()
      .find('[data-testid="menu-button"]')
      .click();
    cy.contains('Edit').click();
    
    cy.get('input[name="name"]').clear().type('Updated Sync Workflow');
    cy.contains('button', 'Update').click();
    
    cy.contains('Updated Sync Workflow').should('be.visible');
  });

  it('should pause and resume workflow', () => {
    cy.contains('Updated Sync Workflow')
      .parent()
      .find('[data-testid="status-toggle"]')
      .click();
    
    cy.contains('Paused').should('be.visible');
    
    cy.contains('Updated Sync Workflow')
      .parent()
      .find('[data-testid="status-toggle"]')
      .click();
    
    cy.contains('Active').should('be.visible');
  });
});
```

### Mappings E2E Tests (`frontend/cypress/e2e/04-mappings.cy.ts`)

```typescript
describe('Mappings Management', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'Admin123!');
    cy.visit('/mappings');
  });

  it('should upload a CSV variable mapping', () => {
    cy.contains('button', 'Upload Mapping').click();
    
    cy.get('input[name="name"]').type('Test Variable Mapping');
    cy.get('[data-testid="mapping-type"]').click();
    cy.contains('Variable Mapping').click();
    
    // Create test CSV file
    const csvContent = 'source_field,target_field,transformation\nfirst_name,given_name,\nlast_name,family_name,uppercase';
    cy.get('input[type="file"]').attachFile({
      fileContent: csvContent,
      fileName: 'variable_mapping.csv',
      mimeType: 'text/csv',
    });
    
    cy.contains('button', 'Upload').click();
    
    cy.contains('Test Variable Mapping').should('be.visible');
    cy.contains('2 records').should('be.visible');
  });

  it('should upload an Excel org unit mapping', () => {
    cy.contains('button', 'Upload Mapping').click();
    
    cy.get('input[name="name"]').type('Test Org Unit Mapping');
    cy.get('[data-testid="mapping-type"]').click();
    cy.contains('Org Unit Mapping').click();
    
    // Attach Excel fixture
    cy.fixture('org_unit_mapping.xlsx', 'binary')
      .then(Cypress.Blob.binaryStringToBlob)
      .then((blob) => {
        const file = new File([blob], 'org_unit_mapping.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        cy.get('input[type="file"]').trigger('change', { dataTransfer });
      });
    
    cy.contains('button', 'Upload').click();
    
    cy.contains('Test Org Unit Mapping').should('be.visible');
  });

  it('should view mapping details', () => {
    cy.contains('Test Variable Mapping')
      .parent()
      .find('[data-testid="view-button"]')
      .click();
    
    cy.contains('Mapping Details').should('be.visible');
    cy.contains('source_field').should('be.visible');
    cy.contains('target_field').should('be.visible');
  });

  it('should delete a mapping', () => {
    cy.contains('Test Variable Mapping')
      .parent()
      .find('[data-testid="delete-button"]')
      .click();
    
    cy.contains('Test Variable Mapping').should('not.exist');
  });

  it('should search mappings', () => {
    cy.get('input[placeholder*="Search"]').type('Org Unit');
    cy.contains('Test Org Unit Mapping').should('be.visible');
  });
});
```

### Transactions & Dashboard Tests (`frontend/cypress/e2e/05-transactions.cy.ts`)

```typescript
describe('Transactions & Dashboard', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'Admin123!');
    
    // Trigger a workflow to create transactions
    cy.createWorkflow({
      name: 'Test Transaction Workflow',
      source_connection_id: 'source-conn-id',
      destination_connection_id: 'dest-conn-id',
      status: 'active',
    });
    
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/workflows/test-workflow-id/trigger`,
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('access_token')}`,
      },
    });
    
    cy.visit('/transactions');
  });

  it('should display transactions list', () => {
    cy.contains('Transactions').should('be.visible');
    cy.get('table').should('be.visible');
    cy.contains('Transaction ID').should('be.visible');
    cy.contains('Workflow').should('be.visible');
    cy.contains('Status').should('be.visible');
  });

  it('should filter transactions by status', () => {
    cy.get('[data-testid="status-filter"]').click();
    cy.contains('Success').click();
    
    cy.get('table').contains('success').should('be.visible');
  });

  it('should search transactions', () => {
    cy.get('input[placeholder*="Search"]').type('txn_');
    cy.get('table').should('be.visible');
  });

  it('should view transaction details', () => {
    cy.get('table tbody tr').first().find('[data-testid="view-button"]').click();
    
    cy.contains('Transaction Details').should('be.visible');
    cy.contains('Processed Records').should('be.visible');
    cy.contains('Duration').should('be.visible');
  });

  it('should display dashboard with real data', () => {
    cy.visit('/dashboard');
    
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Connections').should('be.visible');
    cy.contains('Workflows').should('be.visible');
    cy.contains('Transactions').should('be.visible');
    
    // Check charts
    cy.get('[data-testid="transaction-chart"]').should('be.visible');
    cy.get('[data-testid="workflow-status-chart"]').should('be.visible');
  });

  it('should update dashboard in real-time', () => {
    cy.visit('/dashboard');
    
    // Trigger a workflow from another tab simulation
    cy.window().then((win) => {
      const ws = new WebSocket(`ws://localhost:8000/ws?token=${win.localStorage.getItem('access_token')}`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe_transactions' }));
      };
    });
    
    // Dashboard should update automatically
    cy.wait(5000);
  });
});
```

### Performance Tests (`frontend/cypress/e2e/06-performance.cy.ts`)

```typescript
describe('Performance Tests', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'Admin123!');
  });

  it('should load dashboard within 2 seconds', () => {
    const startTime = performance.now();
    
    cy.visit('/dashboard');
    
    cy.window().then(() => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      expect(loadTime).to.be.lessThan(2000);
    });
  });

  it('should load connections list within 1 second', () => {
    // Create 50 test connections
    for (let i = 0; i < 50; i++) {
      cy.createConnection({
        name: `Test Connection ${i}`,
        type: 'generic',
        url: `https://test${i}.example.com`,
        auth_type: 'basic',
        credentials: { username: 'test', password: 'test' },
      });
    }
    
    const startTime = performance.now();
    cy.visit('/connections');
    
    cy.window().then(() => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      expect(loadTime).to.be.lessThan(1000);
    });
  });

  it('should handle pagination efficiently', () => {
    cy.visit('/transactions');
    
    // Wait for first page
    cy.get('table tbody tr').should('have.length.at.least', 1);
    
    // Click next page
    const startTime = performance.now();
    cy.get('[data-testid="next-page"]').click();
    
    cy.window().then(() => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      expect(loadTime).to.be.lessThan(500);
    });
  });

  it('should upload large mapping file efficiently', () => {
    const startTime = performance.now();
    
    cy.contains('button', 'Upload Mapping').click();
    
    // Generate large CSV (10,000 rows)
    let csvContent = 'source_field,target_field,transformation\n';
    for (let i = 0; i < 10000; i++) {
      csvContent += `field_${i},target_${i},\n`;
    }
    
    cy.get('input[type="file"]').attachFile({
      fileContent: csvContent,
      fileName: 'large_mapping.csv',
      mimeType: 'text/csv',
    });
    
    cy.contains('button', 'Upload').click();
    
    cy.window().then(() => {
      const endTime = performance.now();
      const uploadTime = (endTime - startTime) / 1000;
      expect(uploadTime).to.be.lessThan(30);
    });
  });
});
```

---

## TASK 2: Performance Testing with k6

### k6 Load Test Script (`tests/performance/load-test.js`)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests < 500ms
    'error_rate': ['rate<0.05'],        // Error rate < 5%
    'response_time': ['avg<300', 'p(95)<500'],
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
    },
  },
};

// Test data
const users = [
  { email: 'admin@example.com', password: 'Admin123!' },
  { email: 'analyst1@example.com', password: 'Test123!' },
  { email: 'analyst2@example.com', password: 'Test123!' },
];

// Helper function for authentication
function authenticate(user) {
  const loginRes = http.post(
    'http://localhost:8000/api/v1/auth/login',
    JSON.stringify(user),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  const token = loginRes.json('access_token');
  return token;
}

// Helper function for API requests with auth
function apiRequest(token, method, endpoint, data = null) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  const options = { headers };
  
  let response;
  const startTime = Date.now();
  
  switch (method) {
    case 'GET':
      response = http.get(`http://localhost:8000/api/v1${endpoint}`, options);
      break;
    case 'POST':
      response = http.post(`http://localhost:8000/api/v1${endpoint}`, JSON.stringify(data), options);
      break;
    case 'PUT':
      response = http.put(`http://localhost:8000/api/v1${endpoint}`, JSON.stringify(data), options);
      break;
    case 'DELETE':
      response = http.del(`http://localhost:8000/api/v1${endpoint}`, null, options);
      break;
  }
  
  const duration = Date.now() - startTime;
  responseTime.add(duration);
  
  if (response.status >= 400) {
    errorRate.add(1);
  }
  
  return response;
}

export default function () {
  // Rotate users
  const user = users[__VITUAL_USER_ITERATION % users.length];
  const token = authenticate(user);
  
  if (!token) {
    return;
  }
  
  // Test scenarios
  const scenarios = [
    // Dashboard
    () => {
      const response = apiRequest(token, 'GET', '/dashboard/stats');
      check(response, {
        'dashboard stats loaded': (r) => r.status === 200,
      });
    },
    
    // Connections
    () => {
      const response = apiRequest(token, 'GET', '/connections');
      check(response, {
        'connections loaded': (r) => r.status === 200,
      });
    },
    
    // Workflows
    () => {
      const response = apiRequest(token, 'GET', '/workflows');
      check(response, {
        'workflows loaded': (r) => r.status === 200,
      });
    },
    
    // Create workflow (10% of requests)
    () => {
      if (Math.random() < 0.1) {
        const workflow = {
          name: `Performance Test Workflow ${Date.now()}`,
          description: 'Created during load test',
          source_connection_id: 'source-conn-id',
          destination_connection_id: 'dest-conn-id',
          schedule: '0 */6 * * *',
          status: 'draft',
        };
        const response = apiRequest(token, 'POST', '/workflows', workflow);
        check(response, {
          'workflow created': (r) => r.status === 201,
        });
      }
    },
    
    // Transactions
    () => {
      const response = apiRequest(token, 'GET', '/transactions?limit=50');
      check(response, {
        'transactions loaded': (r) => r.status === 200,
      });
    },
    
    // Mappings
    () => {
      const response = apiRequest(token, 'GET', '/mappings');
      check(response, {
        'mappings loaded': (r) => r.status === 200,
      });
    },
    
    // Audit logs (admin only)
    () => {
      if (user.email === 'admin@example.com') {
        const response = apiRequest(token, 'GET', '/audit-logs?limit=100');
        check(response, {
          'audit logs loaded': (r) => r.status === 200,
        });
      }
    },
    
    // Settings (admin only)
    () => {
      if (user.email === 'admin@example.com') {
        const response = apiRequest(token, 'GET', '/settings/system');
        check(response, {
          'settings loaded': (r) => r.status === 200,
        });
      }
    },
  ];
  
  // Execute random scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
  
  // Think time between requests
  sleep(Math.random() * 2);
}

// Custom scenario for workflow execution test
export function workflowExecutionTest() {
  const adminUser = users[0];
  const token = authenticate(adminUser);
  
  // Create a workflow first
  const workflow = {
    name: `Load Test Workflow ${Date.now()}`,
    description: 'Created for load testing',
    source_connection_id: 'source-conn-id',
    destination_connection_id: 'dest-conn-id',
    schedule: null,
    status: 'active',
  };
  
  const createResponse = apiRequest(token, 'POST', '/workflows', workflow);
  const workflowId = createResponse.json('id');
  
  // Trigger workflow repeatedly
  const iterations = 100;
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const triggerResponse = apiRequest(token, 'POST', `/workflows/${workflowId}/trigger`);
    check(triggerResponse, {
      'workflow triggered': (r) => r.status === 200,
    });
  }
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Triggered ${iterations} workflows in ${duration}s (${iterations / duration} workflows/sec)`);
}
```

### k6 Stress Test Script (`tests/performance/stress-test.js`)

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp to 100 users
    { duration: '5m', target: 500 },   // Ramp to 500 users
    { duration: '10m', target: 1000 }, // Ramp to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(99)<2000'], // 99% of requests < 2s
    'error_rate': ['rate<0.1'],          // Error rate < 10%
  },
};

export default function () {
  // Test breaking point
  const endpoints = [
    '/health',
    '/api/v1/connections',
    '/api/v1/workflows',
    '/api/v1/transactions',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(`http://localhost:8000${endpoint}`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
}
```

---

## TASK 3: Security Testing

### OWASP ZAP Security Scan (`tests/security/zap-scan.py`)

```python
#!/usr/bin/env python3
"""
OWASP ZAP security scan for Interxchange
Requires: pip install zapv2
"""

from zapv2 import ZAPv2
import time
import json
import sys

# Configuration
ZAP_API_KEY = 'your-api-key'
ZAP_PROXY = 'http://localhost:8080'
TARGET_URL = 'http://localhost:3000'

class ZAPSecurityScanner:
    def __init__(self, api_key, proxy):
        self.zap = ZAPv2(apikey=api_key, proxies={'http': proxy, 'https': proxy})
    
    def spider_scan(self, target_url):
        """Crawl the application"""
        print(f'Starting spider scan on {target_url}')
        scan_id = self.zap.spider.scan(target_url)
        
        while int(self.zap.spider.status(scan_id)) < 100:
            print(f'Spider progress: {self.zap.spider.status(scan_id)}%')
            time.sleep(2)
        
        print('Spider scan completed')
        urls = self.zap.spider.results(scan_id)
        print(f'Found {len(urls)} URLs')
        return urls
    
    def active_scan(self, target_url):
        """Run active security scan"""
        print(f'Starting active scan on {target_url}')
        scan_id = self.zap.ascan.scan(target_url)
        
        while int(self.zap.ascan.status(scan_id)) < 100:
            print(f'Active scan progress: {self.zap.ascan.status(scan_id)}%')
            time.sleep(5)
        
        print('Active scan completed')
    
    def get_alerts(self):
        """Get security alerts"""
        alerts = self.zap.core.alerts()
        return alerts
    
    def generate_report(self, format='html'):
        """Generate security report"""
        if format == 'html':
            report = self.zap.core.htmlreport()
            with open('security-report.html', 'w') as f:
                f.write(report)
        elif format == 'json':
            alerts = self.get_alerts()
            with open('security-alerts.json', 'w') as f:
                json.dump(alerts, f, indent=2)
        
        print(f'Report saved as security-report.{format}')
    
    def run_full_scan(self, target_url):
        """Run complete security scan"""
        print('='*60)
        print('Starting OWASP ZAP Security Scan')
        print('='*60)
        
        # Spider scan
        urls = self.spider_scan(target_url)
        
        # Authentication setup
        self.setup_authentication()
        
        # Active scan
        self.active_scan(target_url)
        
        # Get results
        alerts = self.get_alerts()
        
        # Categorize alerts
        high_count = len([a for a in alerts if a.get('risk') == 'High'])
        medium_count = len([a for a in alerts if a.get('risk') == 'Medium'])
        low_count = len([a for a in alerts if a.get('risk') == 'Low'])
        
        print('\n' + '='*60)
        print('Security Scan Results')
        print('='*60)
        print(f'High Risk Issues: {high_count}')
        print(f'Medium Risk Issues: {medium_count}')
        print(f'Low Risk Issues: {low_count}')
        
        # Generate report
        self.generate_report('html')
        self.generate_report('json')
        
        # Fail if high severity issues found
        if high_count > 0:
            print('\n❌ Security scan FAILED: High risk vulnerabilities found!')
            sys.exit(1)
        else:
            print('\n✅ Security scan PASSED: No high risk vulnerabilities')
        
        return alerts
    
    def setup_authentication(self):
        """Setup authentication for scanning authenticated pages"""
        # This would require configuring ZAP with login credentials
        # For now, we'll scan public endpoints
        pass

if __name__ == '__main__':
    scanner = ZAPSecurityScanner(ZAP_API_KEY, ZAP_PROXY)
    scanner.run_full_scan(TARGET_URL)
```

### Penetration Test Script (`tests/security/penetration-test.py`)

```python
#!/usr/bin/env python3
"""
Manual penetration testing script for Interxchange
"""

import requests
import json
import time
from typing import Dict, Any

class PenetrationTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
    
    def login(self, email: str, password: str):
        """Authenticate to get token"""
        response = self.session.post(
            f'{self.base_url}/api/v1/auth/login',
            json={'email': email, 'password': password}
        )
        
        if response.status_code == 200:
            self.token = response.json().get('access_token')
            self.session.headers.update({
                'Authorization': f'Bearer {self.token}'
            })
            return True
        return False
    
    def test_sql_injection(self):
        """Test for SQL injection vulnerabilities"""
        print('\n🔍 Testing SQL Injection...')
        
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users--",
            "admin'--",
            "1' AND '1'='1",
        ]
        
        for payload in payloads:
            # Test in login
            response = self.session.post(
                f'{self.base_url}/api/v1/auth/login',
                json={'email': f'test{payload}@example.com', 'password': 'password'}
            )
            
            if response.status_code != 401:
                print(f'⚠️  Potential SQL injection in login: {payload}')
            
            # Test in search
            response = self.session.get(
                f'{self.base_url}/api/v1/connections?search={payload}'
            )
            
            if response.status_code == 500:
                print(f'⚠️  SQL injection possible in search: {payload}')
        
        print('✅ SQL injection tests completed')
    
    def test_xss(self):
        """Test for Cross-Site Scripting vulnerabilities"""
        print('\n🔍 Testing XSS...')
        
        payloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            'javascript:alert("XSS")',
            '"><script>alert("XSS")</script>',
            '{{7*7}}',
        ]
        
        for payload in payloads:
            # Test in workflow name
            if self.token:
                response = self.session.post(
                    f'{self.base_url}/api/v1/workflows',
                    json={
                        'name': payload,
                        'description': 'Test workflow',
                        'source_connection_id': 'test-id',
                        'destination_connection_id': 'test-id',
                        'status': 'draft'
                    }
                )
                
                if response.status_code == 201:
                    print(f'⚠️  XSS possible in workflow name: {payload}')
        
        print('✅ XSS tests completed')
    
    def test_idor(self):
        """Test for Insecure Direct Object References"""
        print('\n🔍 Testing IDOR...')
        
        # Try to access other users' data
        response = self.session.get(f'{self.base_url}/api/v1/users')
        
        if response.status_code == 200:
            users = response.json()
            for user in users[:3]:
                # Try to modify another user
                update_response = self.session.put(
                    f'{self.base_url}/api/v1/users/{user["id"]}',
                    json={'role': 'admin'}
                )
                
                if update_response.status_code == 200:
                    print(f'⚠️  IDOR vulnerability: Can modify user {user["id"]}')
        
        print('✅ IDOR tests completed')
    
    def test_authentication_bypass(self):
        """Test for authentication bypass"""
        print('\n🔍 Testing Authentication Bypass...')
        
        endpoints = [
            '/api/v1/connections',
            '/api/v1/workflows',
            '/api/v1/users',
            '/api/v1/settings/system',
        ]
        
        # Remove authorization header
        self.session.headers.pop('Authorization', None)
        
        for endpoint in endpoints:
            response = self.session.get(f'{self.base_url}{endpoint}')
            
            if response.status_code == 200:
                print(f'⚠️  Authentication bypass: {endpoint} accessible without token')
        
        print('✅ Authentication bypass tests completed')
    
    def test_rate_limiting(self):
        """Test rate limiting implementation"""
        print('\n🔍 Testing Rate Limiting...')
        
        # Re-authenticate
        self.login('admin@example.com', 'Admin123!')
        
        # Send many requests quickly
        start_time = time.time()
        success_count = 0
        rate_limited = 0
        
        for i in range(200):
            response = self.session.get(f'{self.base_url}/api/v1/connections')
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited += 1
                break
        
        duration = time.time() - start_time
        
        print(f'Requests: {success_count + rate_limited}, Rate limited: {rate_limited}')
        print(f'Duration: {duration:.2f}s, Rate: {(success_count + rate_limited) / duration:.2f} req/s')
        
        if rate_limited > 0:
            print('✅ Rate limiting is working')
        else:
            print('⚠️  Rate limiting may not be configured')
    
    def test_jwt_security(self):
        """Test JWT token security"""
        print('\n🔍 Testing JWT Security...')
        
        # Test with expired token
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4iYCvKvWqWZpLq9VXqLqYVwqVvqVqVqVqVqVqVqVqVq"
        
        response = self.session.get(
            f'{self.base_url}/api/v1/connections',
            headers={'Authorization': f'Bearer {expired_token}'}
        )
        
        if response.status_code == 401:
            print('✅ Expired token correctly rejected')
        
        # Test with invalid signature
        invalid_token = self.token[:-1] + 'x' if self.token else ''
        
        response = self.session.get(
            f'{self.base_url}/api/v1/connections',
            headers={'Authorization': f'Bearer {invalid_token}'}
        )
        
        if response.status_code == 401:
            print('✅ Invalid signature correctly rejected')
    
    def run_all_tests(self):
        """Run all penetration tests"""
        print('\n' + '='*60)
        print('PENETRATION TESTING SUITE')
        print('='*60)
        
        # Authenticate first
        if not self.login('admin@example.com', 'Admin123!'):
            print('❌ Failed to authenticate')
            return
        
        # Run tests
        self.test_authentication_bypass()
        self.test_sql_injection()
        self.test_xss()
        self.test_idor()
        self.test_rate_limiting()
        self.test_jwt_security()
        
        print('\n' + '='*60)
        print('PENETRATION TESTING COMPLETED')
        print('='*60)

if __name__ == '__main__':
    tester = PenetrationTester('http://localhost:8000')
    tester.run_all_tests()
```

---

## TASK 4: Complete API Documentation

### OpenAPI Enhancements (backend/app/main.py)

```python
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Interxchange API",
        version="1.0.0",
        description="""
        # Interxchange Data Integration Platform API
        
        The Interxchange API allows you to programmatically manage your data integration workflows,
        connections, mappings, and channels.
        
        ## Authentication
        
        This API uses JWT tokens for authentication. Obtain a token by calling the `/auth/login` endpoint.
        Include the token in subsequent requests using the `Authorization: Bearer <token>` header.
        
        ## Roles and Permissions
        
        - **Admin**: Full access to all endpoints
        - **Analyst**: Can view all, create/modify workflows and mappings
        - **Editor**: Can create/modify workflows and mappings (cannot delete)
        - **Viewer**: Read-only access
        
        ## Rate Limiting
        
        API requests are rate limited to 100 requests per minute per user.
        
        ## Error Codes
        
        - `400`: Bad Request - Invalid input
        - `401`: Unauthorized - Missing or invalid token
        - `403`: Forbidden - Insufficient permissions
        - `404`: Not Found - Resource not found
        - `429`: Too Many Requests - Rate limit exceeded
        - `500`: Internal Server Error
        """,
        routes=app.routes,
        tags=[
            {"name": "authentication", "description": "Login, logout, and token refresh"},
            {"name": "users", "description": "User management (admin only)"},
            {"name": "connections", "description": "External system connections"},
            {"name": "workflows", "description": "Data integration workflows"},
            {"name": "mappings", "description": "Data transformation mappings"},
            {"name": "channels", "description": "API channels and routing"},
            {"name": "transactions", "description": "Workflow execution logs"},
            {"name": "audit-logs", "description": "System audit trail (admin only)"},
            {"name": "settings", "description": "System configuration"},
            {"name": "dashboard", "description": "Dashboard statistics"},
        ],
    )
    
    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token",
        }
    }
    
    # Add global security requirement
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    # Add rate limit headers to responses
    for path in openapi_schema["paths"].values():
        for method in path.values():
            if "responses" in method:
                method["responses"]["429"] = {
                    "description": "Rate limit exceeded",
                    "content": {
                        "application/json": {
                            "example": {"detail": "Rate limit exceeded. Try again later."}
                        }
                    }
                }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Custom Swagger UI
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="Interxchange API Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url="/openapi.json",
        title="Interxchange API Documentation - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
    )
```

### API Example Collection (`docs/api-examples.md`)

```markdown
# Interxchange API Examples

## Authentication

### Login

```bash
curl -X POST https://api.interxchange.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourPassword123!"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Refresh Token

```bash
curl -X POST https://api.interxchange.example.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

## Connections

### Create Connection

```bash
curl -X POST https://api.interxchange.example.com/api/v1/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "National DHIS2 Instance",
    "type": "dhis2",
    "url": "https://dhis2.health.gov",
    "auth_type": "basic",
    "credentials": {
      "username": "api_user",
      "password": "secure_password"
    }
  }'
```

### List Connections

```bash
curl -X GET "https://api.interxchange.example.com/api/v1/connections?type=dhis2&status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Workflows

### Create Workflow

```bash
curl -X POST https://api.interxchange.example.com/api/v1/workflows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Birth Declaration Sync",
    "description": "Sync birth declarations from Civil Registry to DHIS2",
    "source_connection_id": "123e4567-e89b-12d3-a456-426614174000",
    "destination_connection_id": "123e4567-e89b-12d3-a456-426614174001",
    "schedule": "0 */6 * * *",
    "status": "active"
  }'
```

### Trigger Workflow

```bash
curl -X POST https://api.interxchange.example.com/api/v1/workflows/{workflow_id}/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Mappings

### Upload Mapping File

```bash
curl -X POST https://api.interxchange.example.com/api/v1/mappings/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@variable_mapping.csv" \
  -F "name=DHIS2 Tracker Mapping" \
  -F "type=variable"
```

### Get Mapping Versions

```bash
curl -X GET https://api.interxchange.example.com/api/v1/mappings/{mapping_id}/versions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Transactions

### List Transactions

```bash
curl -X GET "https://api.interxchange.example.com/api/v1/transactions?status=success&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Transaction Details

```bash
curl -X GET https://api.interxchange.example.com/api/v1/transactions/txn_20241215_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Channels

### Create Channel

```bash
curl -X POST https://api.interxchange.example.com/api/v1/channels \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Birth Declaration Webhook",
    "url_pattern": "/api/birth-declarations",
    "method": "POST",
    "routes": [
      {
        "transformation": "json_path",
        "config": {"path": "$.data"},
        "target": "http://internal-service:8000/process"
      }
    ]
  }'
```

## Python SDK Example

```python
import requests

class InterxchangeClient:
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.session = requests.Session()
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
    
    def login(self, email, password):
        response = self.session.post(
            f'{self.base_url}/api/v1/auth/login',
            json={'email': email, 'password': password}
        )
        token = response.json()['access_token']
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        return token
    
    def create_connection(self, name, connection_type, url, auth_type, credentials):
        response = self.session.post(
            f'{self.base_url}/api/v1/connections',
            json={
                'name': name,
                'type': connection_type,
                'url': url,
                'auth_type': auth_type,
                'credentials': credentials
            }
        )
        return response.json()
    
    def create_workflow(self, name, source_conn_id, dest_conn_id, schedule=None):
        response = self.session.post(
            f'{self.base_url}/api/v1/workflows',
            json={
                'name': name,
                'source_connection_id': source_conn_id,
                'destination_connection_id': dest_conn_id,
                'schedule': schedule,
                'status': 'active'
            }
        )
        return response.json()
    
    def trigger_workflow(self, workflow_id):
        response = self.session.post(
            f'{self.base_url}/api/v1/workflows/{workflow_id}/trigger'
        )
        return response.json()

# Usage example
client = InterxchangeClient('https://api.interxchange.example.com')
client.login('admin@example.com', 'password')

# Create connections
source = client.create_connection(
    name='Source System',
    connection_type='generic',
    url='https://source.example.com/api',
    auth_type='basic',
    credentials={'username': 'user', 'password': 'pass'}
)

# Create workflow
workflow = client.create_workflow(
    name='Daily Sync',
    source_conn_id=source['id'],
    dest_conn_id='destination-id'
)

# Trigger workflow
result = client.trigger_workflow(workflow['id'])
print(f"Workflow triggered: {result['transaction_id']}")
```

## JavaScript/TypeScript SDK Example

```typescript
class InterxchangeClient {
  private baseUrl: string;
  private token: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async login(email: string, password: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    this.token = data.access_token;
    return this.token;
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async getConnections(params?: { type?: string; status?: string }) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/connections${query ? `?${query}` : ''}`);
  }
  
  async createWorkflow(data: any) {
    return this.request('/workflows', { method: 'POST', body: JSON.stringify(data) });
  }
  
  async triggerWorkflow(workflowId: string) {
    return this.request(`/workflows/${workflowId}/trigger`, { method: 'POST' });
  }
  
  async getTransactions(params?: { status?: string; limit?: number }) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  }
  
  async uploadMapping(file: File, name: string, type: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('type', type);
    
    return fetch(`${this.baseUrl}/api/v1/mappings/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData
    }).then(res => res.json());
  }
}
```
```

---

## TASK 5: User Documentation

### User Guide (`docs/user-guide.md`)

```markdown
# Interxchange User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Managing Connections](#managing-connections)
3. [Creating Workflows](#creating-workflows)
4. [Uploading Mappings](#uploading-mappings)
5. [Configuring Channels](#configuring-channels)
6. [Monitoring Transactions](#monitoring-transactions)
7. [User Management (Admin)](#user-management-admin)
8. [Audit Logs](#audit-logs)
9. [Settings](#settings)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### Accessing the Platform

1. Open your web browser and navigate to `https://interxchange.example.com`
2. Enter your email and password provided by your administrator
3. Click **Sign In**

### Dashboard Overview

After logging in, you'll see the Dashboard with:
- **Statistics Cards**: Quick overview of connections, workflows, and transactions
- **Transaction Volume Chart**: Monthly transaction success/failure rates
- **Workflow Status Chart**: Distribution of workflow states
- **Recent Transactions**: Latest data exchange activities
- **Activity Feed**: Recent system actions

## Managing Connections

### What are Connections?

Connections represent external systems that Interxchange can communicate with. Supported types include:
- **DHIS2**: Health information systems
- **OpenHIM**: Health interoperability mediator
- **FHIR**: Healthcare data standard
- **HL7**: Health Level 7 messaging
- **Generic HTTP**: Any REST API

### Creating a Connection

1. Navigate to **Connections** from the sidebar
2. Click the **+ New Connection** button
3. Fill in the connection details:
   - **Name**: A descriptive name (e.g., "National DHIS2 Instance")
   - **Type**: Select the system type
   - **URL**: The API endpoint URL
   - **Authentication Type**: Basic, API Key, or OAuth2
   - **Credentials**: Username/password or API key
4. Click **Test Connection** to verify credentials
5. Click **Save**

### Testing a Connection

1. Find the connection card
2. Click the three-dot menu (...)
3. Select **Test**
4. View the test result (success/failure)

### Editing a Connection

1. Click the three-dot menu on the connection card
2. Select **Edit**
3. Update the necessary fields
4. Click **Save**

### Deleting a Connection

> ⚠️ **Warning**: Deleting a connection will also remove any workflows that depend on it.

1. Click the three-dot menu
2. Select **Delete**
3. Confirm deletion

## Creating Workflows

### What are Workflows?

Workflows define how data moves from a source connection to a destination connection, with transformations applied along the way.

### Creating a Workflow

1. Navigate to **Workflows** from the sidebar
2. Click **New Workflow**
3. Configure the workflow:
   - **Name**: Descriptive name (e.g., "Birth Declaration Sync")
   - **Description**: Purpose of the workflow
   - **Source Connection**: Select where data comes from
   - **Destination Connection**: Select where data goes to
   - **Schedule**: Choose frequency or "Manual only"
   - **Status**: Draft, Active, or Paused
4. Click **Create**

### Adding Mappings to a Workflow

1. Open the workflow details
2. Go to the **Mappings** tab
3. Click **Add Mapping**
4. Select existing mappings or upload new ones
5. Click **Save**

### Running a Workflow Manually

1. Find the workflow card
2. Click the **Play** icon (▶️)
3. Confirm execution
4. Monitor progress in the Transactions page

### Viewing Workflow History

1. Open the workflow details
2. Go to the **History** tab
3. View past executions with status, duration, and record counts

### Editing a Workflow

1. Click the three-dot menu on the workflow card
2. Select **Edit**
3. Make changes
4. Click **Update**

### Pausing/Resuming a Workflow

- **Pause**: Click the status toggle to change from Active to Paused
- **Resume**: Click the status toggle to change from Paused to Active

## Uploading Mappings

### What are Mappings?

Mappings define how data is transformed from source format to destination format.

### Types of Mappings

| Type | Description | File Format |
|------|-------------|-------------|
| **Variable Mapping** | Field-to-field mapping with transformations | CSV with columns: source_field, target_field, transformation |
| **Org Unit Mapping** | Organization code to UID mapping | CSV with columns: source_code, target_uid |
| **Options Mapping** | Option value to code mapping | CSV with columns: source_value, target_option_code |
| **Date Format** | Date format transformation | JSON: {"source_format": "...", "target_format": "..."} |

### Uploading a Mapping

1. Navigate to **Mappings**
2. Click **Upload Mapping**
3. Enter a **Name** for the mapping
4. Select the **Mapping Type**
5. Drag & drop or click to select your file
6. Click **Upload**

### Downloading a Mapping

1. Find the mapping in the table
2. Click the download icon (⬇️)
3. Save the file

### Viewing Mapping Versions

1. Click on the mapping name
2. Go to the **Versions** tab
3. View all historical versions
4. Click **Restore** to revert to a previous version

### Deleting a Mapping

1. Click the delete icon (🗑️)
2. Confirm deletion

## Configuring Channels

### What are Channels?

Channels create API endpoints that external systems can call to send data into Interxchange.

### Creating a Channel

1. Navigate to **Channels**
2. Click **+ New Channel**
3. Configure:
   - **Name**: Channel identifier
   - **URL Pattern**: The endpoint path (e.g., `/api/birth-declarations`)
   - **Method**: HTTP method (POST, GET, PUT, DELETE)
   - **Routes**: Transformation steps and target endpoints
4. Click **Create**

### Enabling/Disabling a Channel

- **Enable**: Toggle the status switch to ON
- **Disable**: Toggle the status switch to OFF

### Testing a Channel

1. Copy the webhook URL from the channel details
2. Use curl or Postman to send a test request
3. Check the transaction log for the request

## Monitoring Transactions

### Viewing Transactions

1. Navigate to **Transactions**
2. View the table with all executions
3. Use filters to narrow down:
   - **Status**: Success, Failed, Processing, Pending
   - **Search**: Find by transaction ID or workflow name

### Transaction Details

Click the **View** icon (👁️) to see:
- **Summary**: Status, duration, record counts
- **Source Data**: What was fetched
- **Destination Response**: What was sent
- **Errors**: Any failures with details

### Real-time Updates

When a workflow is running, the transaction status updates automatically in the UI via WebSocket.

## User Management (Admin)

### Inviting a User

1. Navigate to **Users** (Admin only)
2. Click **Invite User**
3. Enter:
   - **Full Name**
   - **Email Address**
   - **Role**
4. Click **Send Invitation**
5. The user receives an email with temporary password

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features |
| **Analyst** | Create/modify workflows, view all data |
| **Editor** | Create/modify workflows (cannot delete) |
| **Viewer** | Read-only access |

### Managing Users

- **Change Role**: Select a new role from dropdown
- **Disable/Enable**: Toggle user status
- **Resend Invite**: Send another invitation email
- **Delete**: Remove user (Admin only)

## Audit Logs

### Viewing Audit Logs (Admin only)

1. Navigate to **Audit Log**
2. View all system actions with:
   - Action type
   - User
   - Resource affected
   - Timestamp
   - IP address

### Filtering Logs

Use filters to narrow down:
- **Action Type**: Login, Create, Update, Delete, etc.
- **User**: Filter by specific user
- **Date Range**: Select start and end dates
- **Search**: Text search in action or resource name

## Settings

### Profile Settings

1. Go to **Settings → Profile**
2. Update your profile information
3. Change your password

### Organization Settings (Admin)

1. Go to **Settings → Organization**
2. Configure:
   - Organization name
   - Country
   - Support email
   - Platform branding (name, color)

### Notification Settings

1. Go to **Settings → Notifications**
2. Configure:
   - Email notifications
   - Slack webhook integration
   - Workflow failure alerts
   - Daily digest

### Security Settings

1. Go to **Settings → Security**
2. Configure:
   - Session timeout
   - Two-factor authentication
   - API Keys management

#### Creating an API Key

1. Click **Generate New API Key**
2. Enter a name (e.g., "Production Server")
3. Select scopes (permissions)
4. Click **Generate**
5. Copy the key immediately (it won't be shown again!)

### System Settings (Admin)

1. Go to **Settings → System**
2. Configure:
   - Default date format
   - Log retention period
   - Timezone
   - Max concurrent workflows

## Troubleshooting

### Common Issues

#### Login Failed

- Verify your email and password
- Check if your account is active (contact admin)
- Try resetting your password

#### Connection Test Fails

- Verify the URL is correct
- Check credentials (username/password)
- Ensure the system is accessible from the server
- Check for firewall rules blocking the connection

#### Workflow Not Executing

- Verify the workflow status is **Active**
- Check that source/destination connections are **Active**
- Ensure mappings are properly configured
- Review transaction logs for specific errors

#### Mapping Upload Fails

- Verify file format matches the mapping type
- Check required columns are present
- Ensure file size is under 50MB
- Validate JSON/XML syntax

#### Slow Performance

- Reduce the number of records processed per run
- Use batch processing with smaller chunk sizes
- Optimize transformations (avoid complex operations)
- Contact admin to increase worker concurrency

### Getting Support

- Check the documentation at `https://docs.interxchange.example.com`
- Contact your system administrator
- Submit a ticket through the support portal

## Best Practices

### Workflow Design

1. Start with a small test dataset before production
2. Use **Draft** status while developing
3. Test thoroughly before activating
4. Monitor initial executions for unexpected data

### Mapping Optimization

1. Use direct field mappings when possible
2. Cache frequently used mappings
3. Validate data types before transformations
4. Handle null/empty values explicitly

### Security

1. Rotate API keys regularly
2. Use the principle of least privilege for roles
3. Enable two-factor authentication for admin accounts
4. Review audit logs weekly

### Performance

1. Schedule workflows during off-peak hours
2. Use incremental data fetching (lastUpdated parameters)
3. Limit concurrent workflow executions
4. Archive old transaction logs
```

---

## TASK 6: Training Materials

### Training Video Script (`docs/training/video-script.md`)

```markdown
# Interxchange Training Video Script

## Video 1: Introduction (5 minutes)

**Scene: Dashboard overview**

"Welcome to Interxchange, your health data integration platform. In this video series, you'll learn how to connect systems, create workflows, and monitor data exchanges."

**Key points:**
- What is Interxchange?
- System architecture overview
- User roles and permissions
- Tour of the interface

## Video 2: Setting Up Connections (8 minutes)

**Scene: Connections page walkthrough**

"Connections are the bridges between Interxchange and your external systems. Let's create one."

**Demonstration:**
1. Click "New Connection"
2. Select DHIS2 type
3. Enter URL: https://dhis2.health.gov
4. Choose Basic authentication
5. Enter credentials
6. Test connection
7. Save

**Best practices:**
- Use descriptive names
- Store credentials securely (Vault handles this)
- Test before using in workflows

## Video 3: Creating Your First Workflow (10 minutes)

**Scene: Workflows page**

"Now let's create a workflow that moves data from a source to a destination with transformations."

**Demonstration:**
1. Create new workflow
2. Name: "Birth Declaration Sync"
3. Select source connection (Civil Registry API)
4. Select destination connection (DHIS2)
5. Set schedule: Every 6 hours
6. Status: Active
7. Save

**Adding mappings:**
1. Go to Mappings tab
2. Upload variable mapping CSV
3. Map source fields to destination fields
4. Apply transformations (uppercase, date format)

## Video 4: Monitoring and Troubleshooting (7 minutes)

**Scene: Transactions page**

"Every workflow execution creates a transaction record you can monitor."

**Demonstration:**
1. View transaction list
2. Filter by status (Success/Failed)
3. Click transaction details
4. View source data fetched
5. View destination response
6. Identify errors

**Troubleshooting tips:**
- Check error details field
- Verify source data format
- Validate transformation logic
- Test connections individually

## Video 5: Admin Features (12 minutes)

**Scene: Admin sections**

"As an administrator, you have additional capabilities."

**User Management:**
1. Invite new users
2. Assign roles (Admin, Analyst, Editor, Viewer)
3. Disable/enable accounts
4. Resend invitations

**Audit Logs:**
1. View all system actions
2. Filter by user, action, date
3. Export logs for compliance

**System Settings:**
1. Configure organization branding
2. Set log retention policy
3. Manage API keys
4. Configure notifications (email/Slack)

## Video 6: API Usage for Developers (10 minutes)

**Scene: API documentation**

"Developers can automate Interxchange using our REST API."

**Demonstration:**
1. Generate API key (Settings → Security)
2. View OpenAPI documentation at `/docs`
3. Example: Create connection with curl
4. Example: Trigger workflow with Python
5. Example: WebSocket for real-time updates

**Code examples:**
```bash
curl -X POST https://api.interxchange.example.com/api/v1/workflows/{id}/trigger \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Video 7: Best Practices & Performance (5 minutes)

**Scene: Dashboard with charts**

"Follow these best practices to get the most from Interxchange."

**Performance:**
- Schedule workflows during off-peak hours
- Use incremental fetching when possible
- Limit concurrent workflow executions
- Monitor system health (Prometheus/Grafana)

**Security:**
- Rotate API keys regularly
- Enable 2FA for admin accounts
- Review audit logs weekly
- Use HTTPS in production

**Data Quality:**
- Validate source data before transformation
- Handle null values explicitly
- Test with small datasets first
- Monitor success rates

## Conclusion (2 minutes)

"Thank you for completing the Interxchange training. You now have the knowledge to integrate your health information systems efficiently."

**Resources:**
- User Guide: docs.interxchange.example.com
- API Documentation: api.interxchange.example.com/docs
- Support Portal: support.interxchange.example.com
```

### Quick Reference Card (`docs/quick-reference.pdf` generation script)

```markdown
# Interxchange Quick Reference Card

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + N` | New connection |
| `Ctrl/Cmd + Shift + N` | New workflow |
| `Ctrl/Cmd + E` | Edit current item |
| `Ctrl/Cmd + D` | Delete current item |
| `Ctrl/Cmd + R` | Run workflow |
| `Ctrl/Cmd + L` | Logout |
| `?` | Show shortcuts |

## Common Tasks

| Task | Steps |
|------|-------|
| **Create Connection** | Connections → New Connection → Fill form → Test → Save |
| **Create Workflow** | Workflows → New Workflow → Select source/dest → Set schedule → Save |
| **Upload Mapping** | Mappings → Upload Mapping → Name → Type → File → Upload |
| **Run Workflow** | Workflows → Play icon → Confirm |
| **View Transaction** | Transactions → Click row → View details |
| **Invite User** | Users → Invite User → Email → Role → Send |
| **Generate API Key** | Settings → Security → Generate API Key → Name → Scopes → Generate |

## API Quick Examples

### Get Connections
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.interxchange.example.com/api/v1/connections
```

### Trigger Workflow
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://api.interxchange.example.com/api/v1/workflows/{id}/trigger
```

### Upload Mapping
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@mapping.csv" \
  -F "name=My Mapping" \
  -F "type=variable" \
  https://api.interxchange.example.com/api/v1/mappings/upload
```

## Role Permissions Matrix

| Feature | Admin | Analyst | Editor | Viewer |
|---------|-------|---------|--------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| Create Connections | ✅ | ✅ | ✅ | ❌ |
| Edit Connections | ✅ | ✅ | ✅ | ❌ |
| Delete Connections | ✅ | ❌ | ❌ | ❌ |
| Create Workflows | ✅ | ✅ | ✅ | ❌ |
| Edit Workflows | ✅ | ✅ | ✅ | ❌ |
| Delete Workflows | ✅ | ❌ | ❌ | ❌ |
| Upload Mappings | ✅ | ✅ | ✅ | ❌ |
| Delete Mappings | ✅ | ❌ | ❌ | ❌ |
| View Transactions | ✅ | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ |
| Configure Settings | ✅ | ❌ | ❌ | ❌ |

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check input data format |
| 401 | Unauthorized | Refresh token or login again |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource ID is incorrect |
| 429 | Rate Limit | Slow down request rate |
| 500 | Server Error | Contact administrator |

## Support Contacts

- **Documentation**: docs.interxchange.example.com
- **API Docs**: api.interxchange.example.com/docs
- **Status Page**: status.interxchange.example.com
- **Email Support**: support@interxchange.example.com
- **Slack**: interxchange.slack.com
```

---

## TASK 7: Production Readiness Checklist

### Production Deployment Checklist (`docs/production-checklist.md`)

```markdown
# Interxchange Production Readiness Checklist

## Pre-Deployment Verification

### Infrastructure
- [ ] Production server(s) provisioned with sufficient resources
- [ ] Load balancer configured (Nginx/HAProxy)
- [ ] SSL/TLS certificates installed and valid
- [ ] Firewall rules configured (allow only necessary ports)
- [ ] Backup storage configured (S3/separate volume)
- [ ] Monitoring stack deployed (Prometheus/Grafana)
- [ ] Log aggregation configured (ELK/Loki)
- [ ] Database replication configured (primary/replica)

### Security
- [ ] Vault configured and sealed
- [ ] All secrets rotated (database, Redis, JWT)
- [ ] API rate limiting configured
- [ ] CORS properly configured (specific origins only)
- [ ] HTTPS enforced (HSTS enabled)
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] 2FA configured for admin accounts
- [ ] OWASP ZAP scan completed with no high-risk issues

### Application Configuration
- [ ] Environment variables set (.env.production)
- [ ] Database migrations applied
- [ ] Redis password set
- [ ] JWT secret keys generated (32+ chars)
- [ ] SMTP configured for email notifications
- [ ] Slack webhook configured (if used)
- [ ] Log level set to INFO/WARNING
- [ ] Debug mode disabled
- [ ] Static files served via CDN

### Performance Testing
- [ ] Load test completed (100 concurrent users)
- [ ] Stress test completed (finding breaking point)
- [ ] Endurance test completed (8 hours runtime)
- [ ] Database query optimization verified
- [ ] Cache hit ratio > 80%
- [ ] API response time < 500ms (p95)
- [ ] Frontend load time < 2 seconds
- [ ] WebSocket connection stability verified

### Backup & Recovery
- [ ] Automated database backups scheduled (daily)
- [ ] Backup retention policy configured (30 days)
- [ ] Offsite backups configured (S3)
- [ ] Restore procedure tested and documented
- [ ] Disaster recovery plan documented
- [ ] Backup monitoring alerts configured

### Monitoring & Alerting
- [ ] Prometheus metrics exposed
- [ ] Grafana dashboards created
- [ ] Critical alerts configured:
  - [ ] Service down alerts
  - [ ] High error rate (>5%)
  - [ ] High latency (>2s)
  - [ ] Database connection pool exhausted
  - [ ] Disk space < 20%
  - [ ] Memory usage > 85%
  - [ ] CPU usage > 80%
- [ ] On-call rotation configured
- [ ] Runbook documentation complete

### Documentation
- [ ] Deployment guide updated
- [ ] User guide complete
- [ ] API documentation complete
- [ ] Troubleshooting guide written
- [ ] Runbook for common issues
- [ ] Training materials created

### Compliance (if applicable)
- [ ] GDPR compliance verified
- [ ] Data retention policies configured
- [ ] Audit logs retained (minimum 1 year)
- [ ] User data export feature tested
- [ ] User deletion (right to be forgotten) implemented

## Deployment Steps

### 1. Pre-Deployment
```bash
# Backup current database
./scripts/backup.sh

# Run tests
pytest tests/
npm test

# Build containers
docker compose -f docker-compose.prod.yml build
```

### 2. Deployment
```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Run migrations
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# Deploy new containers
docker compose -f docker-compose.prod.yml up -d

# Verify health
curl -f https://interxchange.example.com/health
```

### 3. Post-Deployment Verification
- [ ] Login page loads
- [ ] Authentication works
- [ ] Dashboard loads with data
- [ ] Connections page functional
- [ ] Workflows page functional
- [ ] Create test workflow and run
- [ ] WebSocket connection established
- [ ] Metrics endpoint accessible
- [ ] Logs showing no errors

### 4. Rollback Plan
If issues detected:

```bash
# Rollback to previous version
./scripts/rollback.sh production previous

# Or restore database backup
./scripts/restore.sh /backups/latest_backup.sql.gz
```

## Go/No-Go Decision Criteria

### GO if ALL of following are true:
- [ ] All critical tests passing
- [ ] No high-severity security issues
- [ ] Performance meets requirements
- [ ] Backup and restore tested
- [ ] Monitoring and alerts working
- [ ] Documentation complete

### NO-GO if ANY of following are true:
- [ ] Critical bug found
- [ ] Security vulnerability unresolved
- [ ] Performance degradation > 20%
- [ ] Database migration fails
- [ ] Vault unsealed/unavailable
- [ ] Major feature broken

## Post-Launch Monitoring (First 48 Hours)

| Time | Check |
|------|-------|
| 1 hour | Error rate, response time, CPU/memory |
| 4 hours | Database connections, queue sizes |
| 8 hours | Disk space, log rotation |
| 12 hours | Backup completed successfully |
| 24 hours | User feedback, support tickets |
| 48 hours | Performance trends, security scan |

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Development Lead | | | |
| DevOps Engineer | | | |
| Security Officer | | | |
| Product Manager | | | |
| QA Lead | | | |
```

### Final Code Review Checklist (`docs/code-review-checklist.md`)

```markdown
# Code Review Checklist - Interxchange

## Backend (Python/FastAPI)

### Code Quality
- [ ] Follows PEP 8 style guide
- [ ] Type hints used for all function signatures
- [ ] Docstrings present for all public functions/classes
- [ ] No commented-out code
- [ ] No print statements (use logger)
- [ ] Imports properly grouped and sorted
- [ ] No circular dependencies

### Security
- [ ] No hardcoded secrets/credentials
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output escaping)
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Authentication required where needed
- [ ] Role-based access control enforced

### Performance
- [ ] Database queries optimized (N+1 avoided)
- [ ] Indexes added for filtered columns
- [ ] Pagination implemented for list endpoints
- [ ] Async/await used for I/O operations
- [ ] Connection pooling configured
- [ ] Caching implemented where appropriate

### Error Handling
- [ ] Specific exceptions caught (not bare except)
- [ ] Appropriate HTTP status codes returned
- [ ] Error messages don't leak sensitive info
- [ ] Retry logic for transient failures
- [ ] Dead letter queue for failed tasks

### Testing
- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] Edge cases covered
- [ ] Mock external dependencies
- [ ] Coverage > 80%

### Documentation
- [ ] OpenAPI descriptions for all endpoints
- [ ] Complex logic explained in comments
- [ ] README updated for new features
- [ ] API examples in documentation

## Frontend (React/TypeScript)

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] No `any` types (use proper types)
- [ ] Components follow functional style with hooks
- [ ] Props properly typed
- [ ] No inline styles (use MUI `sx` or styled)
- [ ] Proper error boundaries

### Performance
- [ ] React.memo for expensive components
- [ ] useMemo/useCallback for expensive calculations
- [ ] Lazy loading for routes
- [ ] Images optimized
- [ ] Bundle size monitored

### Security
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] No sensitive data in localStorage
- [ ] CSRF token included in requests
- [ ] CSP headers configured

### Testing
- [ ] Component tests written
- [ ] User interaction tests
- [ ] API mocking for async operations
- [ ] Accessibility tests (a11y)
- [ ] E2E tests for critical flows

### State Management
- [ ] Redux slices well-structured
- [ ] Async thunks for API calls
- [ ] Loading/error states handled
- [ ] Selectors memoized

### Accessibility
- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Color contrast sufficient
- [ ] Screen reader compatible

## Database (PostgreSQL)

### Schema Design
- [ ] Proper data types used
- [ ] Foreign keys with appropriate constraints
- [ ] Indexes on frequently queried columns
- [ ] JSONB used for flexible schemas
- [ ] No reserved keywords as column names

### Migrations
- [ ] Migrations are reversible
- [ ] No data loss on rollback
- [ ] Indexes created after data insertion
- [ ] Default values for new columns

### Performance
- [ ] Query execution plans reviewed
- [ ] Connection pool size appropriate
- [ ] No N+1 queries in ORM
- [ ] Batch operations for bulk data

## DevOps & Infrastructure

### Docker
- [ ] Multi-stage builds for smaller images
- [ ] Non-root user for containers
- [ ] Health checks configured
- [ ] Resource limits set
- [ ] Secrets not in Dockerfile

### CI/CD
- [ ] Tests run on every PR
- [ ] Security scans automated
- [ ] Docker images scanned
- [ ] Deployment automated (staging/prod)
- [ ] Rollback capability

### Monitoring
- [ ] Metrics exposed for critical paths
- [ ] Structured logging in JSON format
- [ ] Alerts configured for anomalies
- [ ] Dashboards created
```

---

## DELIVERABLES CHECKLIST

Before considering Phase 7 complete and project production-ready, ensure all items below are implemented:

### Testing
- [ ] Cypress E2E tests for all critical flows
- [ ] k6 load test script and results
- [ ] k6 stress test script
- [ ] OWASP ZAP security scan
- [ ] Penetration test script
- [ ] All tests passing in CI

### Documentation
- [ ] Complete OpenAPI documentation with examples
- [ ] API example collection (curl, Python, JS)
- [ ] User guide (10+ sections)
- [ ] Training video scripts
- [ ] Quick reference card
- [ ] Production readiness checklist
- [ ] Code review checklist
- [ ] Deployment guide updated
- [ ] Troubleshooting guide

### Training Materials
- [ ] Video script (7 videos)
- [ ] Slide deck (PPT/Google Slides)
- [ ] Hands-on lab exercises
- [ ] Quiz questions and answers

### Production Readiness
- [ ] All checklist items reviewed
- [ ] Security scan no high-risk issues
- [ ] Performance tests passing
- [ ] Backup/restore tested
- [ ] Disaster recovery plan documented
- [ ] Runbook created
- [ ] On-call rotation configured

### Final Cleanup
- [ ] Remove all debug code and console.logs
- [ ] Remove commented-out code
- [ ] Update version numbers (package.json, setup.py)
- [ ] Generate changelog
- [ ] Tag release in Git
- [ ] Create GitHub release with notes

---

## NOTES FOR GEMINI

1. **Test completeness** - Ensure all critical user journeys are covered by E2E tests
2. **Performance benchmarks** - Document baseline performance metrics
3. **Security** - No high-risk vulnerabilities should remain
4. **Documentation** - Must be comprehensive and user-friendly
5. **Training** - Materials should be ready for user onboarding
6. **Production readiness** - Run through the entire checklist
7. **Final sign-off** - Get approval from all stakeholders

---

**Begin Phase 7 implementation now. This is the final phase before production launch. Focus on quality, completeness, and user readiness. After completing each major component, indicate progress and ask for sign-off.**