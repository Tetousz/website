const USERNAME_KEY = 'ferretusz_chess_username'


export function getUsername() {
    return localStorage.getItem(USERNAME_KEY) || ''
}

export function saveUsername(username) {
    localStorage.setItem(USERNAME_KEY, username.trim())
}



export function validateUsername(username) {
    const trimmed = username.trim()


    if (trimmed.length < 1) {
        return 'Enter a username'
    }

    if (trimmed.length > 20) {
        return 'Username must be 20 characters or less.'
    }


    if (!/^[\p{L}\p{N}_\- ]+$/u.test(trimmed)) {
        return 'Only letters, numbers, spaces, _ and - are allowed.'
    }

        return null
}