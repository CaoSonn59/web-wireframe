import { useState } from 'react';
import DeviceSelection from './components/DeviceSelection';
import Workspace from './components/Workspace';

export default function App() {
  const [boardSize, setBoardSize] = useState(null);

  const handleDeviceSelect = (size) => {
    setBoardSize(size);
  };

  const handleChangeScreen = () => {
    setBoardSize(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {boardSize === null ? (
        <DeviceSelection onSelect={handleDeviceSelect} />
      ) : (
        <Workspace boardSize={boardSize} onChangeScreen={handleChangeScreen} />
      )}
    </div>
  );
}
