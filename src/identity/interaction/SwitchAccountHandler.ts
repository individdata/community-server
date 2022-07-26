import type { Operation } from '../../http/Operation';
import { getLoggerFor } from '../../logging/LogUtil';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { FoundHttpError } from '../../util/errors/FoundHttpError';
import { readJsonStream } from '../../util/StreamUtil';
import { BaseInteractionHandler } from './BaseInteractionHandler';
import type { InteractionHandlerInput } from './InteractionHandler';

const loginView = {
  required: {
    email: 'string',
    password: 'string',
    remember: 'boolean',
  },
} as const;

/**
 * Handles the submission of the Switch Account Form.
 * Will throw a RedirectHttpError on success.
 */
export class SwitchAccountHandler extends BaseInteractionHandler {
  protected readonly logger = getLoggerFor(this);

  public constructor() {
    super(loginView);
  }

  public async canHandle(input: InteractionHandlerInput): Promise<void> {
    await super.canHandle(input);
    if (input.operation.method === 'POST' && !input.oidcInteraction) {
      throw new BadRequestHttpError(
        'This action can only be performed as part of an OIDC authentication flow.',
        { errorCode: 'E0002' },
      );
    }
  }

  public async handlePost({ operation, oidcInteraction }: InteractionHandlerInput): Promise<never> {
    const shouldSwitchAccount = await this.parseInput(operation);
    if (shouldSwitchAccount) {
      delete oidcInteraction!.result;
    }
    if (!oidcInteraction!.params) {
      oidcInteraction!.params = {};
    }
    oidcInteraction!.params.hasBeenAskedToSwitchAccounts = true;
    await oidcInteraction!.save(oidcInteraction!.exp - Math.floor(Date.now() / 1000));

    throw new FoundHttpError(oidcInteraction!.returnTo);
  }

  /**
   * Validates the input data. Also makes sure remember is a boolean.
   * Will throw an error in case something is wrong.
   */
  private async parseInput(operation: Operation): Promise<boolean> {
    const json = await readJsonStream(operation.body.data);
    return json.operation !== 'continue';
  }
}
