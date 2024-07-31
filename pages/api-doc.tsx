import { GetStaticProps, InferGetStaticPropsType } from 'next';
import { createSwaggerSpec } from 'next-swagger-doc';
import dynamic from 'next/dynamic';
import React from 'react';
import 'swagger-ui-react/swagger-ui.css';

// Create a wrapper component to handle the type discrepancy
const SwaggerUIWrapper = ({ spec }: { spec: Record<string, any> }) => {
  const SwaggerUI = require('swagger-ui-react').default;
  return <SwaggerUI spec={spec} />;
};

// Use dynamic import for the wrapper component
const DynamicSwaggerUI = dynamic(() => Promise.resolve(SwaggerUIWrapper), {
  ssr: false,
});

function ApiDoc({ spec }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <DynamicSwaggerUI spec={spec} />;
}

export const getStaticProps: GetStaticProps = async () => {
  const spec: Record<string, any> = createSwaggerSpec({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Remote Viewing Investment API',
        version: '1.0',
      },
    },
  });

  return {
    props: {
      spec,
    },
  };
};

export default ApiDoc;