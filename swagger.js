import { createSwaggerSpec } from 'next-swagger-doc';

const spec = createSwaggerSpec({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Remote Viewing Investment API',
      version: '1.0',
    },
  },
  apiFolder: 'pages/api',
});

export default spec;