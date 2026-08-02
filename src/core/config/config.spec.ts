import { createAppConfig } from './index';
import { Environment } from './app-config';
import { ApiScenario } from '../scenario/api-scenario';
import { DbScenario } from '../scenario/db-scenario';

describe('createAppConfig', () => {
  it('resolves dev defaults (fakes on, logs on)', () => {
    const config = createAppConfig({ appEnv: 'dev' });
    expect(config.environment).toBe(Environment.Dev);
    expect(config.useFakeApi).toBe(true);
    expect(config.useFakeDatabase).toBe(true);
    expect(config.enableLogs).toBe(true);
  });

  it('disables fakes outside dev even if the env var says so', () => {
    const config = createAppConfig({
      appEnv: 'prod',
      useFakeApi: 'true',
      useFakeDatabase: 'true',
    });
    expect(config.useFakeApi).toBe(false);
    expect(config.useFakeDatabase).toBe(false);
    expect(config.enableLogs).toBe(false);
  });

  it('parses scenario overrides', () => {
    const config = createAppConfig({
      appEnv: 'dev',
      apiScenario: ApiScenario.ServerError,
      dbScenario: DbScenario.Empty,
    });
    expect(config.apiScenario).toBe(ApiScenario.ServerError);
    expect(config.dbScenario).toBe(DbScenario.Empty);
  });

  it('falls back to dev for an unknown env', () => {
    expect(createAppConfig({ appEnv: 'whatever' }).environment).toBe(
      Environment.Dev,
    );
  });
});
