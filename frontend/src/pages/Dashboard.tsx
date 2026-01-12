function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Documents</h2>
          <p className="text-gray-600">Upload and manage your documents</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Knowledge Base</h2>
          <p className="text-gray-600">Search extracted entities and events</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">Timeline</h2>
          <p className="text-gray-600">View historical events chronologically</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
export { Dashboard };
