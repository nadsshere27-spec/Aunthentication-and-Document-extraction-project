import "./Button.css";

function Button({
  text,
  type = "button",
  onClick,
  disabled = false,
}) {
  return (
    <button
      className="btn"
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
}

export default Button;