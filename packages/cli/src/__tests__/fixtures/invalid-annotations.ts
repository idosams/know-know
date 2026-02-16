/**
 * @knowgraph
 * type: function
 * description: A valid function annotation
 * owner: test-team
 * status: stable
 * tags:
 *   - testing
 */
export function validFunction(): void {
  console.log('valid');
}

/**
 * @knowgraph
 * type: function
 * description: A function with invalid status value
 * owner: test-team
 * status: active
 */
export function invalidStatusFunction(): void {
  console.log('bad status');
}
