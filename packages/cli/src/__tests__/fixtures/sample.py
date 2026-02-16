"""
@knowgraph
type: function
description: A sample function for testing
owner: test-team
status: stable
tags:
  - testing
  - sample
"""
def sample_function(x, y):
    """Add two numbers together.

    @knowgraph
    type: function
    description: Adds two numbers and returns the result
    owner: test-team
    status: stable
    tags:
      - math
      - utility
    """
    return x + y


class SampleClass:
    """
    @knowgraph
    type: class
    description: A sample class for testing
    owner: test-team
    status: experimental
    tags:
      - testing
    """

    def method_one(self):
        """
        @knowgraph
        type: method
        description: First method of the sample class
        owner: test-team
        """
        pass
