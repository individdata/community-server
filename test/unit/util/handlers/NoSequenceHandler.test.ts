import type { AsyncHandler } from '../../../../src/util/handlers/AsyncHandler';
import { NoSequenceHandler } from '../../../../src/util/handlers/NoSequenceHandler';

describe('No SequenceHandler', (): void => {
  const handlers: jest.Mocked<AsyncHandler<string, string>>[] = [
    {
      handle: jest.fn().mockResolvedValue('0'),
    } as any,
    {
      handle: jest.fn().mockResolvedValue('2'),
    } as any,
  ];
  let composite: NoSequenceHandler<string, string>;

  beforeEach(async(): Promise<void> => {
    composite = new NoSequenceHandler<string, string>(handlers);
  });

  it('runs all supported handlers.', async(): Promise<void> => {
    await composite.handleSafe('test');

    expect(handlers[0].handle).toHaveBeenCalledTimes(1);
    expect(handlers[0].handle).toHaveBeenLastCalledWith('test');

    expect(handlers[1].handle).toHaveBeenCalledTimes(1);
    expect(handlers[1].handle).toHaveBeenLastCalledWith('test');
  });
});
