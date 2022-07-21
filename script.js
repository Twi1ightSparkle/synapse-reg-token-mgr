const loginForm = document.querySelector('#loginForm');
const accessTokenInput = document.querySelector('#accessToken');
const serverDomainInput = document.querySelector('#serverDomain');
const loginBtn = document.querySelector('#loginBtn');

const editForm = document.querySelector('#editForm');
const tokenInput = document.querySelector('#token');
const usesAllowedInput = document.querySelector('#uses_allowed');
const expiryTimeInput = document.querySelector('#expiry_time');
const lengthInput = document.querySelector('#length');

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
 * Reset the token input form
 */
function clearForm() {
    tokenInput.disabled = false;
    tokenInput.value = '';
    usesAllowedInput.disabled = false;
    usesAllowedInput.value = '';
    expiryTimeInput.disabled = false;
    expiryTimeInput.value = '';
    lengthInput.disabled = false;
    lengthInput.value = '';
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

        if (res.status !== 200) {
            return alert(`Unable get list access tokens`);
        }

        result = await res.json();
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

    result.registration_tokens.forEach((token) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<tr>
            <td><code>${token.token.length > 10 ? `${token.token.slice(0, 10)}...` : token.token}<code></td>
            <td>${token.uses_allowed}</td>
            <td>${token.pending}</td>
            <td>${token.completed}</td>
            <td>${token.expiry_time ?? 'Never'}</td>
            <td>
                <span onclick="editToken('${token.token}')" style="cursor:pointer">
                    <i class="fa-solid fa-pencil"></i>
                </span>
            </td>
            <td>
                <span onclick="deleteToken('${token.token}')" style="cursor:pointer">
                    <i class="fa-solid fa-trash-can"></i>
                </span>
            </td>
        </tr>`;
        tokenTable.appendChild(tr);
    });
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

        if (res.status !== 200) {
            return alert('Unable fetch token');
        }

        result = await res.json();
    } catch (err) {
        return alert('Unable fetch token');
    }

    usesAllowedInput.value = result.uses_allowed;
    expiryTimeInput.value = result.uses_allowed;

    tokenInput.disabled = true;
    tokenInput.value = result.token;
}

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

        if (res.status !== 200) {
            return alert('Unable delete token');
        }
    } catch (err) {
        return alert('Unable delete token');
    }

    getTokens();
}

/**
 * If an access token and domain is stored, populate the login form and change the login button
 */
window.onload = function () {
    if (isLoggedIn) {
        document.querySelector('#accessToken').value = localStorage.getItem('accessToken');
        document.querySelector('#serverDomain').value = localStorage.getItem('serverDomain');
        changeLoginBtn(false);
        getTokens();
    }
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
});
