import { createRoot } from 'react-dom/client'

function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Page</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => alert('Click works!')}>Test Button</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<TestApp />)
