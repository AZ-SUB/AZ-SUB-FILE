import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import LeftImage from "../../assets/1.png";
import LogoImage from "../../assets/2.png";
import "./Login.css";
import supabase from "../../config/supabaseClient";

function Login() {
  const navigate = useNavigate();
  const { setUserRole, setCurrentUser } = useApp();

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    let email = identifier;

    // If the identifier is not an email, look it up as username
    if (!identifier.includes("@")) {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", identifier)
        .single();

      if (fetchError || !data?.email) {
        setError("Username not found");
        return;
      }

      email = data.email;
    }

    // Sign in with email and password
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const user = data.user;
    if (!user) {
      setError("Login failed. Try again.");
      return;
    }

    // Fetch the latest account_type from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("account_type, id, username, first_name, last_name, Status")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      setError("Could not fetch user profile.");
      return;
    }

    // Check if account is inactive
    if (profileData.Status === "Inactive") {
      const accountType = profileData.account_type?.toLowerCase();
      if (accountType === "ap") {
        setError("Your account is inactive. Contact the Agency Leader");
      } else if (accountType === "al") {
        setError("Your Account is Inactive. Contact the Admin");
      } else {
        setError("Your account is inactive. Please contact support.");
      }
      return;
    }

    const accountType = profileData.account_type?.toLowerCase();

    // Set user role in context
    setUserRole(accountType?.toUpperCase());

    // Set current user with real data from database
    setCurrentUser({
      id: profileData.id,
      username: profileData.username,
      name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || profileData.username,
      firstName: profileData.first_name,
      lastName: profileData.last_name,
      email: user.email,
      role: accountType?.toUpperCase()
    });

    switch (accountType) {
      case "admin":
        navigate("/admin/dashboard");
        break;
      case "al":
        navigate("/al/dashboard");
        break;
      case "ap":
        navigate("/ap/dashboard");
        break;
      case "mp":
        navigate("/mp/dashboard");
        break;
      case "md":
        navigate("/md/dashboard");
        break;
      default:
        setError("Unknown account type.");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-left-panel">
          <img src={LeftImage} alt="Insurance Image" />
          <h2>Explore Our Insurance Solutions</h2>
          <p>
            At Caelum, we offer insurance plans in the Philippines to address Filipinos' most common financial needs. Whatever your financial need, we are with you in your journey to a more secure tomorrow.
          </p>
        </div>

        <div className="login-right-panel">
          <img src={LogoImage} alt="Allianz Logo" className="logo" />
          <p className="description">
            Everything you need to know about your Caelum policy
          </p>

          <h2 className="signin-prompt">SIGN IN</h2>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    /* Eye Off Icon (Hide) */
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.09" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    /* Eye Icon (Show) */
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="signin-button">
              SIGN IN
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;