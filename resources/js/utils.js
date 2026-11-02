import logging from "@patternslib/patternslib/src/core/logging";
import utils from "@plone/mockup/src/core/utils";

const log = logging.getLogger("pat-mosaic-utils");

// generate uid for it: http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
const generate_uid = function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

// Get a current CSRF token from the server.
//
// The token embedded in the edit page can be outdated (e.g. the keyring was
// rotated while the page was open, or the page contains a token for another
// user). A write with an invalid token is aborted by plone.protect, but the
// response still looks successful (the form's redirect is kept), so the
// changes would be lost silently. Fetching the token right before a write
// avoids that. All `_authenticator` inputs on the page are updated, so the
// edit form submitted on "Save" gets the current token as well.
//
// Falls back to the token in the page if the request fails.
const get_fresh_authenticator = async function (context_url) {
    try {
        const response = await fetch(`${context_url}/@@authenticator/token`, {
            cache: "no-store",
            credentials: "same-origin",
        });
        if (response.ok) {
            const token = (await response.text()).trim();
            if (/^[0-9a-f]{40}$/.test(token)) {
                document
                    .querySelectorAll('input[name="_authenticator"]')
                    .forEach((input) => (input.value = token));
                return token;
            }
        }
        log.warn(
            `Could not get a fresh authenticator (${response.status}), using the one in the page.`,
        );
    } catch (error) {
        log.warn(
            `Could not get a fresh authenticator (${error}), using the one in the page.`,
        );
    }
    return utils.getAuthenticator();
};

export default {
    generate_uid: generate_uid,
    get_fresh_authenticator: get_fresh_authenticator,
};
