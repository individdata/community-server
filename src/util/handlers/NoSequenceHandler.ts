import { AsyncHandler } from './AsyncHandler';

/**
 */
export class NoSequenceHandler<TIn = void, TOut = void> extends AsyncHandler<TIn, TOut | undefined> {
  private readonly handlers: AsyncHandler<TIn, TOut>[];

  public constructor(handlers: AsyncHandler<TIn, TOut>[]) {
    super();
    this.handlers = [ ...handlers ];
  }

  public async handle(input: TIn): Promise<TOut | undefined> {
    let result: TOut | undefined;
    for (const handler of this.handlers) {
      result = await handler.handle(input);
    }
    return result;
  }
}
