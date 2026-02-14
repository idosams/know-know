"""
@codegraph
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

    @codegraph
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
    @codegraph
    type: class
    description: A sample class for testing
    owner: test-team
    status: experimental
    tags:
      - testing
    """

    def method_one(self):
        """
        @codegraph
        type: method
        description: First method of the sample class
        owner: test-team
        """
        pass
