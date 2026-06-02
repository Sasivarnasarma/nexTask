export function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-sm w-full text-center flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Sign in to nexTask</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your team workspace credentials</p>
        </div>
        <button
          onClick={onLogin}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold p-3 rounded-lg transition-colors shadow-sm"
        >
          Simulate Secure Login
        </button>
      </div>
    </div>
  );
}
