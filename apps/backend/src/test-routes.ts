import Fastify from 'fastify';

async function testRoutes(app: any) {
  console.log('Inside testRoutes function');
  app.get('/test', async () => {
    return { message: 'Test route works!' };
  });
  console.log('Route registered inside testRoutes');
}

async function main() {
  const app = Fastify({ logger: true });
  
  console.log('Before app.register');
  app.register(testRoutes);
  console.log('After app.register');
  
  await app.ready();
  console.log('App ready');
  
  await app.listen({ port: 3001, host: '0.0.0.0' });
  console.log('Server listening on port 3001');
  
  // Print all routes
  console.log('Registered routes:');
  app.printRoutes();
}

main().catch(console.error);
