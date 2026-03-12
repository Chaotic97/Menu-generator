import { Routes, Route } from 'react-router-dom';
import MenuListView from './components/MenuListView.jsx';
import MenuEditor from './components/MenuEditor.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MenuListView />} />
      <Route path="/menus/:id" element={<MenuEditor />} />
    </Routes>
  );
}
