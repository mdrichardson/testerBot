import { ConversationReference } from 'botbuilder';

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Simple object used by the user state property accessor.
 * Used to store the user state.
 */

interface IProactiveId {
    [id: string]: {
        completed: boolean;
        reference: Partial<ConversationReference>;
    };
}

class UserProfile {
    // member variables
    public proactiveIdList: IProactiveId;
    public context: any;
    reference: any;
    /**
     * Constructor. Members initialized with undefined,
     *  if no values provided via constructor
     *
     * The *Executed variables are meant to contain strings of dialog test that have been
     * COMPLETELY executed and will then be hidden
     *
     * @param testsExecuted string
     * @param generalExecuted string
     */
    constructor(proactiveIdList?: IProactiveId) {
      this.proactiveIdList = proactiveIdList || {};
    }
  }

export { UserProfile };
