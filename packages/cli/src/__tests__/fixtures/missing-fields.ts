/**
 * @knowgraph
 * type: function
 * description: Function with all recommended fields
 * owner: test-team
 * status: stable
 * tags:
 *   - complete
 */
export function completeFunction(): void {
  console.log('complete');
}

/**
 * @knowgraph
 * type: function
 * description: Function missing owner, status, and tags
 */
export function missingFieldsFunction(): void {
  console.log('missing fields');
}
