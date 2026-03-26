Fix copied tile content being empty. The tile's ``initialize()`` method
was fetching content from the server (which doesn't exist yet for the copy),
overwriting the already inserted HTML. Now ``initialize()`` accepts a
``skipContent`` parameter to skip the content fetch when copying.
Also properly ``await`` the ``save()`` call to prevent race conditions.
@petschki
