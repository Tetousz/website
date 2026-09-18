function UsernameInput({
  username,
  onChange,
  error,
}) {
  return (
    <div className="username-field">
      <label htmlFor="chess-username">
        Username
      </label>

      <input
        id="chess-username"
        type="text"
        value={username}
        maxLength={20}
        autoComplete="nickname"
        placeholder="Enter username"
        onChange={(event) => onChange(event.target.value)}
      />

      {error && (
        <p className="input-error">
          {error}
        </p>
      )}
    </div>
  )
}

export default UsernameInput