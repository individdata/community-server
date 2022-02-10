import assert from 'assert';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { getLoggerFor } from '../../../../logging/LogUtil';
import { readJsonStream } from '../../../../util/StreamUtil';
import type { InteractionResponseResult, InteractionHandlerInput, InteractionCompleteResult } from '../../email-password/handler/InteractionHandler';
import { InteractionHandler } from '../../email-password/handler/InteractionHandler';
import { BankIdClient } from './BankIDClient';
import { RegistrationManager } from '../../email-password/util/RegistrationManager';
import type { AccountStore } from '../../email-password/storage/AccountStore';
import { hash } from 'bcrypt';

export interface BankIDHandlerArgs {
  registrationManager: RegistrationManager;
  accountStore: AccountStore;
  production: boolean;
  pfxPath: string;
  caPath: string;
  passphrase: string;
}

/**
 * Handles the submission of the BankID form
 */
export class BankIDHandler extends InteractionHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly registrationManager: RegistrationManager;
  
  private readonly accountStore: AccountStore;

  private readonly client: BankIdClient;

  public constructor(args: BankIDHandlerArgs) {
    super();
    this.registrationManager = args.registrationManager;
    this.accountStore = args.accountStore;
    this.client = new BankIdClient({
      production: args.production,
      pfx: args.pfxPath,
      ca: args.caPath,
      passphrase: args.passphrase,
    });
  }

  public async handle({ operation }: InteractionHandlerInput): Promise<InteractionCompleteResult | InteractionResponseResult> {
    // Validate input data
    const { pno: inputPno } = await readJsonStream(operation.body.data);
    assert(
      typeof inputPno === 'string' && inputPno.length === 12,
      'Invalid request. The ssn/pno must be format YYYYMMDDXXXX',
    );

    // Initiate and wait for BankID authentication completion
    const { completionData } = await this.client.authenticateAndCollect({
      personalNumber: inputPno,
      endUserIp: "127.0.0.1",
    });

    if (completionData === undefined) {
      throw new InternalServerError('Authentication failed, completion data missing in response');
    }

    const { user } = completionData;
    const { name, personalNumber: pno } = user;

    const validated =  {
      email: `${pno}@example.com`,
      // webId: 'http://localhost:3000/user/profile/card#me',
      password: 'test',
      podName: pno,
      // template?: string,
      createWebId: true,
      register: true,
      createPod: true,
      rootPod: false,
    };
    const details = await this.registrationManager.register(validated, false);
    
    if (details.webId === undefined) {
      throw new InternalServerError('Authentication failed, could not get WebID from registration');
    }
    
    const webId = await this.accountStore.authenticate(validated.email, validated.password);
    
    // return { type: 'response', details: { name } };
    
    return {
      type: 'complete',
      details: { webId, shouldRemember: false },
    };
  }
}
