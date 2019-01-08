// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Simple object used by the user state property accessor.
 * Used to store the user state.
 */
class UserProfile {
    // member variables
    public testsExecuted: string[];
    public generalExecuted: string[];
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
    constructor(testsExecuted?: string[], generalExecuted?: string[]) {
      this.testsExecuted = testsExecuted || [];
      this.generalExecuted = generalExecuted || [];
    }
  }

export { UserProfile };
