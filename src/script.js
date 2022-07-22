const loginForm = document.querySelector('#loginForm');
const accessTokenInput = document.querySelector('#accessToken');
const serverDomainInput = document.querySelector('#serverDomain');
const loginBtn = document.querySelector('#loginBtn');

const editForm = document.querySelector('#editForm');
const tokenInput = document.querySelector('#token');
const usesAllowedInput = document.querySelector('#uses_allowed');
const expiryTimeInput = document.querySelector('#expiry_time');
const lengthInput = document.querySelector('#length');
const saveTokenBtn = document.querySelector('#saveToken');

const tokenTableDiv = document.querySelector('#tokenTableDiv');

/**
 * Checks if an access token is stored in localStorage
 * @returns {Boolean} True if one if found (if logged in)
 */
const isLoggedIn = () => (localStorage.getItem('accessToken') ? true : false);

/**
 * Changes the text and color of the login button
 * @param {Boolean} login True to set to login, false to set to logout
 */
function changeLoginBtn(login) {
    if (login) {
        loginBtn.className = 'btn btn-outline-success';
        loginBtn.textContent = 'Login';
        accessTokenInput.required = true;
        serverDomainInput.required = true;
    } else {
        loginBtn.className = 'btn btn-outline-danger';
        loginBtn.textContent = 'Logout';
        accessTokenInput.required = false;
        serverDomainInput.required = false;
    }
}

/**
 * Get the unix time stamp in two weeks form now
 * @returns {Number} Unix time stamp
 */
function inTwoWeeks() {
    let inTwoWeeks = new Date().getTime();
    inTwoWeeks += 14 * 24 * 60 * 60 * 1000 - 1;
    return inTwoWeeks;
}
/**
 * Fetch credentials from localStorage
 * @returns {Object} Object containing accessToken, serverDomain, and headers (for fetch)
 */
function getCredentials() {
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();

    headers.append('Authorization', `Bearer ${token}`);
    return {
        accessToken,
        serverDomain: localStorage.getItem('serverDomain'),
        headers,
    };
}

/**
 * Convert a unix time stamp into human readable date
 * @param {Number} timestamp UNIX time stamp in milliseconds since epoch
 * @returns {String}         String formatted in format Jan 18, 2022
 */
function fromUnixTime(timestamp) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeZone: 'UTC',
    }).format(timestamp);
}

/**
 * Reset the token input form
 */
function clearForm() {
    // Get tomorrows date in format yyyy-mm-dd
    const today = new Date();
    let tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow = tomorrow.toISOString().split('T')[0];

    tokenInput.disabled = false;
    tokenInput.value = '';

    usesAllowedInput.disabled = false;
    usesAllowedInput.value = '';

    expiryTimeInput.disabled = false;
    expiryTimeInput.min = tomorrow;
    expiryTimeInput.value = '';

    lengthInput.disabled = false;
    lengthInput.value = '';

    saveTokenBtn.textContent = 'Create';
}

/**
 * Create a table row for an registration token and appends it to the existing table
 * @param {Object} token                On object with information about the token
 * @param {String} token.token          The token
 * @param {Number} token.uses_allowed   Uses allowed
 * @param {Number} token.pending        Pending used
 * @param {Number} token.completed      Successful registrations
 * @param {Number} token.expiry_time    Token Expiration time as UNIX time stamp
 */
function createTr(token) {
    const tokenTable = document.querySelector('#tokenTable');
    const tr = document.createElement('tr');

    // Give the row an ID so it can be easily removed without redrawing the whole table
    // const b64 = btoa(token);
    tr.id = `token-${token.token}`;

    tr.innerHTML = `<td>
        <code>${token.token.length > 16 ? `${token.token.slice(0, 16)}...` : token.token}<code></td>
        <td>${token.uses_allowed}</td>
        <td>${token.pending}</td>
        <td>${token.completed}</td>
        <td>${token.expiry_time ? fromUnixTime(token.expiry_time) : 'Never'}</td>
        <td class="text-center">
            <span onclick="editToken('${token.token}')" style="cursor:pointer">
                <i class="fa-solid fa-pencil"></i>
            </span>
        </td>
        <td class="text-center">
            <span onclick="deleteToken('${token.token}')" style="cursor:pointer">
                <i class="fa-solid fa-trash-can"></i>
            </span>
    </td>`;
    tokenTable.appendChild(tr);
}

/**
 * Get all registration tokens from Synapse and create the table
 * @returns Nothing
 */
async function getTokens() {
    const { serverDomain, headers } = getCredentials();

    let result;
    try {
        const res = await fetch(`https://${serverDomain}/_synapse/admin/v1/registration_tokens`, {
            method: 'GET',
            headers,
        });

        result = await res.json();

        if (res.status !== 200) {
            return alert(`Unable get list access tokens. ${result.error}`);
        }
    } catch (err) {
        return alert(`Unable get list access tokens: ${err}`);
    }

    // const table = document.createElement('table');
    tokenTableDiv.innerHTML = `<table class="table table-bordered" id="tokenTable">
        <tr>
            <th>Token</th>
            <th>Uses allowed</th>
            <th>Pending uses</th>
            <th>Successful registrations</th>
            <th>Expiration time</th>
            <th>Edit</th>
            <th>Delete</th>
        </tr>
    </table>`;

    result.registration_tokens.forEach((token) => createTr(token));
}

/**
 * Fetch a token and add it's editable details to the form
 * @param {String} token The token to load
 */
async function editToken(token) {
    const { serverDomain, headers } = getCredentials();

    let result;
    try {
        const res = await fetch(`https://${serverDomain}/_synapse/admin/v1/registration_tokens/${token}`, {
            method: 'GET',
            headers,
        });

        result = await res.json();

        if (res.status !== 200) {
            return alert(`Unable fetch token. ${result.error}`);
        }
    } catch (err) {
        return alert('Unable fetch token');
    }

    usesAllowedInput.value = result.uses_allowed;
    usesAllowedInput.min = result.pending + result.completed || 1;

    expiryTimeInput.valueAsNumber = result.expiry_time || '';

    lengthInput.value = result.token.length;
    lengthInput.disabled = true;

    tokenInput.disabled = true;
    tokenInput.value = result.token;

    saveTokenBtn.textContent = 'Update';
}

/**
 * Validate the token and add a red ring around the input if invalid.
 * Also disables the token length input if a token is specified
 */
tokenInput.addEventListener('focusout', (event) => {
    console.log('sdggfsd');
    const token = tokenInput.value;
    if (!/^[A-Za-z0-9\._~-]+$/.test(token) && token.length > 0) {
        tokenInput.classList.add('is-invalid');
        allowedCharacters.hidden = false;
    } else {
        tokenInput.classList.remove('is-invalid');
    }

    lengthInput.disabled = token.length > 0 ? true : false;
});

/**
 * Deletes a registration token
 * @param {String} token The token to delete
 */
async function deleteToken(token) {
    if (!confirm(`Delete registration token: ${token}`)) {
        return;
    }

    const { serverDomain, headers } = getCredentials();

    try {
        const res = await fetch(`https://${serverDomain}/_synapse/admin/v1/registration_tokens/${token}`, {
            method: 'DELETE',
            headers,
        });

        const result = await res.json();

        if (res.status !== 200) {
            return alert(`Unable delete token. ${result.error}`);
        }
    } catch (err) {
        return alert('Unable delete token');
    }

    document.getElementById(`token-${token}`).remove();
}

/**
 * Runs when the token form is submitted
 */
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const editing = tokenInput.disabled;

    // This ensures the token is valid through the selected day
    const almostOneDay = 60 * 60 * 24 - 1;

    const body = {
        expiry_time: expiryTimeInput.valueAsNumber + almostOneDay || inTwoWeeks(),
        uses_allowed: Number(usesAllowedInput.value) || 10,
    };

    if (tokenInput.value) {
        body.token = tokenInput.value;
    } else {
        body.length = Number(lengthInput.value) || 16;
    }

    const { serverDomain, headers } = getCredentials();
    headers.append('Content-Type', 'application/json');

    let path = '/_synapse/admin/v1/registration_tokens/new';
    let method = 'POST';

    if (tokenInput.disabled) {
        path = `/_synapse/admin/v1/registration_tokens/${tokenInput.value}`;
        method = 'PUT';
    }

    let result;
    try {
        const res = await fetch(`https://${serverDomain}${path}`, {
            method,
            headers,
            body: JSON.stringify(body),
        });

        result = await res.json();

        if (res.status !== 200) {
            return alert(`Unable create token. ${result.error}`);
        }
    } catch (err) {
        return alert('Unable create token');
    }

    if (editing) {
        document.getElementById(`token-${tokenInput.value}`).remove();
    }

    createTr(result);
    clearForm();
});

/**
 * If an access token and domain is stored, populate the login form and change the login button
 */
window.onload = function () {
    if (isLoggedIn()) {
        document.querySelector('#accessToken').value = localStorage.getItem('accessToken');
        document.querySelector('#serverDomain').value = localStorage.getItem('serverDomain');
        changeLoginBtn(false);
        getTokens();
    }
    clearForm();
};

/**
 * Runs when the login form is submitted
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isLoggedIn()) {
        if (confirm('Confirm logout')) {
            localStorage.clear();
            accessTokenInput.value = '';
            serverDomainInput.value = '';
            changeLoginBtn(true);
            clearForm();
            tokenTableDiv.innerHTML = '';
        }
        return;
    }

    const accessToken = accessTokenInput.value;
    const serverDomain = serverDomainInput.value;

    const headers = new Headers();
    headers.append('Authorization', `Bearer ${accessToken}`);

    // Test connection to server
    try {
        const res = await fetch(`https://${serverDomain}/_matrix/client/r0/login`, {
            method: 'GET',
        });

        if (res.status !== 200) {
            return alert(`Unable to connect to Synapse on ${serverDomain}`);
        }

        const result = await res.json();
        const flows = result.flows;
    } catch (err) {
        return alert(`Unable to connect to Synapse on ${serverDomain}. ${err}`);
    }

    // Test access token
    let mxid;
    try {
        const res = await fetch(`https://${serverDomain}/_matrix/client/r0/account/whoami`, {
            method: 'GET',
            headers,
        });

        if (res.status !== 200) {
            return alert(`Unable to log in to ${serverDomain}`);
        }

        const result = await res.json();
        mxid = result.user_id;
    } catch (err) {
        return alert(`Unable to log in to ${serverDomain}. ${err}`);
    }

    // Check if admin
    try {
        const res = await fetch(`https://${serverDomain}/_synapse/admin/v1/users/${mxid}/admin`, {
            method: 'GET',
            headers,
        });

        if (res.status !== 200) {
            return alert(`User ${mxid} is not admin on ${serverDomain}`);
        }

        const result = await res.json();
        const admin = result.admin;
        if (admin) {
            alert(`Successfully signed in as ${mxid}`);
        }
    } catch (err) {
        return alert(`User ${mxid} is not admin on ${serverDomain}. ${err}`);
    }

    localStorage.setItem('serverDomain', serverDomain);
    localStorage.setItem('accessToken', accessToken);
    changeLoginBtn(false);
    getTokens();
});
