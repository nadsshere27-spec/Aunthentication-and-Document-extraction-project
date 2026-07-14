import "./Loader.css";

function Loader({ fullPage = true }) {
  return (
    <div className={fullPage ? "loader-page" : "loader-inline"}>
      <div className="loader-spinner"></div>
    </div>
  );
}

export default Loader;