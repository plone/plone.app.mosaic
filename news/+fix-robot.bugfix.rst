Fix the robot tests by removing a unnecessary wait statement.

The keyword "Wait For Elements State" is not safe to use in playwright tests.
It was removed for all ".mosaic-helper-tile-new" assignments to fix the failing
tests.
@thet
