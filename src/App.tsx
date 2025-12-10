import { useState } from 'react'
import { DarkModeProvider } from './context/DarkModeContext'
import { Sidebar } from './components/Sidebar'
import { Home } from './pages/Home'
import { Productos } from './pages/Productos'
import { Proveedores } from './pages/Proveedores'
import { Ubicaciones } from './pages/Ubicaciones'
import { Movimientos } from './pages/Movimientos'
import { Ventas } from './pages/Ventas'
import { Recibos } from './pages/Recibos'
import { Perfiles } from './pages/Perfiles'
import { Categorias } from './pages/Categorias'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />
      case 'productos':
        return <Productos />
      case 'proveedores':
        return <Proveedores/>
      case 'ubicaciones':
        return <Ubicaciones/>
      case 'movimientos':
        return <Movimientos/>
      case 'ventas':
        return <Ventas/>
      case 'recibos':
        return <Recibos/>
      case 'categorias':
        return <Categorias/>
      case 'perfiles':
        return <Perfiles/>
      default:
        return <Home />
    }
  }

  return (
    <DarkModeProvider>
      <div className="flex min-h-screen transition-colors duration-300">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 md:ml-64 transition-all duration-300">
          {renderPage()}
        </main>
      </div>
    </DarkModeProvider>
  )
}

export default App

