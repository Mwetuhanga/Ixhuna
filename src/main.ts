// Load .env before any module is evaluated: several modules read
// process.env when they're defined (e.g. the JWT secret), which happens
// before ConfigModule would load it.
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  // Behind a load balancer or reverse proxy, set TRUST_PROXY (e.g. "1" for
  // one hop) so req.ip is the client's address; the web form's per-IP rate
  // limit depends on it.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    // Express reads a string as a list of trusted addresses, so booleans
    // and hop counts must be passed as their real types.
    const hops = Number(trustProxy);
    app.set(
      'trust proxy',
      trustProxy === 'true' ? true : trustProxy === 'false' ? false : Number.isNaN(hops) ? trustProxy : hops
    );
  }
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Omnichannel support bot listening on port ${port}`);
}

bootstrap();
