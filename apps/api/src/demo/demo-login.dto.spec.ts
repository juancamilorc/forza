import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { DemoLoginDto } from './demo-login.dto';

describe('DemoLoginDto', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const meta: ArgumentMetadata = { type: 'body', metatype: DemoLoginDto };

  it.each(['admin', 'trainer', 'nutritionist'])('acepta %s', async (role) => {
    await expect(pipe.transform({ role }, meta)).resolves.toEqual({ role });
  });

  it.each(['super_admin', '', 'ADMIN', 'root'])('rechaza el rol "%s"', async (role) => {
    await expect(pipe.transform({ role }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza cuerpo sin rol o con campos extra', async () => {
    await expect(pipe.transform({}, meta)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ role: 'admin', email: 'x@y.co' }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });
});
