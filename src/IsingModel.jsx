// IsingModel.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import {
  Sun,
  Moon,
  Thermometer,
  Link2,
  RotateCcw,
  Play,
  Pause,
  Magnet,
  Circle,
  Square,
  Activity,
  Plus,
  Minus,
  Grid as GridIcon,
  RefreshCcw,
  StopCircle,
  Video,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import GIF from 'gif.js.optimized'; // Import the GIF library

const IsingModel = () => {
  const [grid, setGrid] = useState([]);
  const [size, setSize] = useState(30);
  const [temperature, setTemperature] = useState(2.0);
  const [coupling, setCoupling] = useState(1.0);
  const [externalField, setExternalField] = useState(0.0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [radius, setRadius] = useState(1);
  const [startTime, setStartTime] = useState(null);
  const [magnetization, setMagnetization] = useState(0);
  const [circle, setCircle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [magnetizationHistory, setMagnetizationHistory] = useState([]);
  const [annealingRate, setAnnealingRate] = useState(0);
  const [drawMode, setDrawMode] = useState('circle'); // 'circle' or 'square'
  const [initialPattern, setInitialPattern] = useState('random'); // New state for initial pattern
  const [gridInitialized, setGridInitialized] = useState(false); // New state to track grid initialization
  const [simulationSpeed, setSimulationSpeed] = useState(100); // Adjustable simulation speed
  const [isRecording, setIsRecording] = useState(false); // Recording state
  const [gif, setGif] = useState(null); // GIF instance
  const canvasRef = useRef(null);

  // Initialize grid with different patterns
  const initializeGrid = useCallback(
    (pattern = initialPattern) => {
      setGridInitialized(false); // Indicate that grid is being initialized
      let newGrid = [];

      if (pattern === 'positive') {
        // All spins +1
        newGrid = Array(size)
          .fill()
          .map(() => Array(size).fill(1));
      } else if (pattern === 'negative') {
        // All spins -1
        newGrid = Array(size)
          .fill()
          .map(() => Array(size).fill(-1));
      } else if (pattern === 'checkerboard') {
        // Checkerboard pattern
        newGrid = Array(size)
          .fill()
          .map((_, y) =>
            Array(size)
              .fill()
              .map((_, x) => ((x + y) % 2 === 0 ? 1 : -1))
          );
      } else {
        // Random spins (default)
        newGrid = Array(size)
          .fill()
          .map(() =>
            Array(size)
              .fill()
              .map(() => (Math.random() < 0.5 ? 1 : -1))
          );
      }

      setGrid(newGrid);
      setMagnetizationHistory([]);
      setGridInitialized(true); // Grid has been initialized
    },
    [size, initialPattern]
  );

  useEffect(() => {
    initializeGrid();
  }, [initializeGrid]);

  // Pause simulation when size changes
  useEffect(() => {
    setIsPlaying(false);
    initializeGrid();
  }, [size, initializeGrid]);

  // Calculate magnetization
  useEffect(() => {
    if (
      !gridInitialized ||
      !grid.length ||
      grid.length !== size ||
      !grid[0] ||
      grid[0].length !== size
    )
      return;
    const totalSpins = size * size;
    const sumSpins = grid.flat().reduce((sum, spin) => sum + spin, 0);
    const netMagnetization = (sumSpins / totalSpins) * 100;
    setMagnetization(netMagnetization);
    setMagnetizationHistory((prev) => [...prev, netMagnetization]);
  }, [grid, size, gridInitialized]);

  const calculateDeltaE = useCallback(
    (x, y) => {
      if (
        !gridInitialized ||
        !grid.length ||
        grid.length !== size ||
        !grid[0] ||
        grid[0].length !== size ||
        !grid[y] ||
        grid[y][x] === undefined
      )
        return 0;

      const spin = grid[y][x];
      let sum = 0;

      const neighbors = [
        [(y - 1 + size) % size, x],
        [(y + 1) % size, x],
        [y, (x - 1 + size) % size],
        [y, (x + 1) % size],
      ];

      for (const [ny, nx] of neighbors) {
        if (grid[ny] && grid[ny][nx] !== undefined) {
          sum += grid[ny][nx];
        }
      }

      const deltaE = 2 * coupling * spin * sum + 2 * externalField * spin;
      return deltaE;
    },
    [grid, size, coupling, externalField, gridInitialized]
  );

  const flipSpinsInRadius = useCallback(
    (centerX, centerY, radius) => {
      if (
        !gridInitialized ||
        !grid.length ||
        grid.length !== size ||
        !grid[0] ||
        grid[0].length !== size
      )
        return;

      const newGrid = grid.map((row) => row.slice());

      const xStart = Math.max(0, Math.floor(centerX - radius));
      const xEnd = Math.min(size - 1, Math.ceil(centerX + radius));
      const yStart = Math.max(0, Math.floor(centerY - radius));
      const yEnd = Math.min(size - 1, Math.ceil(centerY + radius));

      for (let y = yStart; y <= yEnd; y++) {
        for (let x = xStart; x <= xEnd; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          let inShape = false;

          if (drawMode === 'circle') {
            inShape = dx * dx + dy * dy <= radius * radius;
          } else if (drawMode === 'square') {
            inShape = Math.abs(dx) <= radius && Math.abs(dy) <= radius;
          }

          if (inShape) {
            const deltaE = calculateDeltaE(x, y);
            if (
              deltaE <= 0 ||
              Math.random() < Math.exp(-deltaE / Math.max(0.1, temperature))
            ) {
              newGrid[y][x] *= -1;
            }
          }
        }
      }

      setGrid(newGrid);
    },
    [grid, size, calculateDeltaE, temperature, drawMode, gridInitialized]
  );

  // Evolve the system over time
  const evolveSystem = useCallback(() => {
    if (
      !gridInitialized ||
      !grid.length ||
      grid.length !== size ||
      !grid[0] ||
      grid[0].length !== size
    )
      return;

    const newGrid = grid.map((row) => row.slice());

    for (let i = 0; i < size * size; i++) {
      const x = Math.floor(Math.random() * size);
      const y = Math.floor(Math.random() * size);

      if (!grid[y] || grid[y][x] === undefined) continue;

      const deltaE = calculateDeltaE(x, y);
      if (
        deltaE <= 0 ||
        Math.random() < Math.exp(-deltaE / Math.max(0.1, temperature))
      ) {
        newGrid[y][x] *= -1;
      }
    }

    setGrid(newGrid);
  }, [grid, size, temperature, calculateDeltaE, gridInitialized]);

  // Annealing effect
  useEffect(() => {
    let interval;
    if (annealingRate !== 0 && isPlaying) {
      interval = setInterval(() => {
        setTemperature((prevTemp) => Math.max(0.1, prevTemp + annealingRate));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [annealingRate, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(evolveSystem, simulationSpeed);
      return () => clearInterval(interval);
    }
  }, [isPlaying, evolveSystem, simulationSpeed]);

  // Draw the grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !gridInitialized ||
      !canvas ||
      !grid.length ||
      grid.length !== size ||
      !grid[0] ||
      grid[0].length !== size
    )
      return;

    const ctx = canvas.getContext('2d');
    const cellSize = canvas.width / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cells with neon glow effect
    for (let y = 0; y < size; y++) {
      if (!grid[y]) continue;
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === undefined) continue;

        const cellX = x * cellSize;
        const cellY = y * cellSize;

        const value = grid[y][x];
        const color =
          value === 1
            ? { main: '#00FFF0', shadow: '#00bfb7' } // Cyan
            : { main: '#FF71CE', shadow: '#b000b0' }; // Pink

        // Draw glow effect
        ctx.fillStyle = color.shadow;
        ctx.fillRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2);

        // Draw main color
        ctx.fillStyle = color.main;
        ctx.fillRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
      }
    }

    // Draw the expanding shape if it exists
    if (circle) {
      ctx.beginPath();
      if (drawMode === 'circle') {
        ctx.arc(
          circle.x * cellSize + cellSize / 2,
          circle.y * cellSize + cellSize / 2,
          circle.radius * cellSize,
          0,
          2 * Math.PI
        );
      } else if (drawMode === 'square') {
        ctx.rect(
          (circle.x - circle.radius) * cellSize,
          (circle.y - circle.radius) * cellSize,
          circle.radius * 2 * cellSize,
          circle.radius * 2 * cellSize
        );
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Capture frame if recording
    if (isRecording && gif && canvas) {
      gif.addFrame(canvas, {
        copy: true,
        delay: Math.round(simulationSpeed / 10), // Convert milliseconds to centiseconds
      });
    }
  }, [
    grid,
    size,
    circle,
    drawMode,
    gridInitialized,
    isRecording,
    gif,
    simulationSpeed,
  ]);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * size) / rect.width;
    const y = ((e.clientY - rect.top) * size) / rect.height;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;

    setIsDrawing(true);
    setStartTime(Date.now());
    setRadius(1);

    const { x, y } = getMousePos(e);

    if (x >= 0 && x < size && y >= 0 && y < size) {
      flipSpinsInRadius(x, y, radius);
      setCircle({ x, y, radius: 1 });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;

    const currentRadius = Math.min(15, 1 + (Date.now() - startTime) / 100);
    setRadius(currentRadius);

    const { x, y } = getMousePos(e);

    if (x >= 0 && x < size && y >= 0 && y < size) {
      flipSpinsInRadius(x, y, currentRadius);
      setCircle({ x, y, radius: currentRadius });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setRadius(1);
    setCircle(null);
  };

  const handleReset = () => {
    setSize(30);
    setTemperature(2.0);
    setCoupling(1.0);
    setExternalField(0.0);
    setAnnealingRate(0);
    setDrawMode('circle');
    setInitialPattern('random');
    setSimulationSpeed(100);
    setIsPlaying(false);
    setMagnetizationHistory([]);
    initializeGrid('random');
  };

  // Touch event handlers for mobile devices
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    handleMouseDown({
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  // Dynamic background based on net magnetization
  const getBackgroundStyle = () => {
    if (magnetization > 50) {
      return 'sunrise-background';
    } else if (magnetization < -50) {
      return 'night-background';
    } else {
      return 'default-background';
    }
  };

  // Recording functions
  const handleStartRecording = () => {
    const gifInstance = new GIF({
      workers: 2,
      quality: 10,
      workerScript: '/js/gif.worker.js', // Ensure this path is correct
    });
    setGif(gifInstance);
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (gif) {
      gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'simulation.gif';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
      gif.render();
    }
    setIsRecording(false);
  };

  // Handle grid size change without performance warning
  const handleGridSizeChange = (e, value) => {
    setSize(value);
  };

  return (
    <div
      className={`relative min-h-screen w-full flex items-center justify-center p-8 ${getBackgroundStyle()}`}
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Vaporwave Night Background */}
        {magnetization < -50 && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A1B3D] to-[#0D0D0D]">
            {/* Stars */}
            <div className="absolute w-full h-full">
              {Array.from({ length: 100 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute bg-white rounded-full opacity-75"
                  style={{
                    width: '2px',
                    height: '2px',
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {/* Sunrise/Sunset Background */}
        {magnetization > 50 && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF758C] via-[#FF7EB3] to-[#FFB199]">
            {/* Sun */}
            <div
              className="absolute w-64 h-64 rounded-full"
              style={{
                background: 'radial-gradient(circle, #FFD700, #FF6B99)',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 100px #FF6B99',
                opacity: '0.8',
              }}
            />
          </div>
        )}
        {/* Default Background */}
        {magnetization >= -50 && magnetization <= 50 && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF1F7D] via-[#FF758C] to-[#FF8C41]">
            {/* Sun */}
            <div
              className="absolute w-64 h-64 rounded-full"
              style={{
                background: 'linear-gradient(to bottom, #FFD700, #FF6B99)',
                top: '20%',
                left: '50%',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 100px #FF6B99',
                opacity: '0.8',
              }}
            />
          </div>
        )}

        {/* Grid lines */}
        <div className="absolute bottom-0 left-0 right-0 h-[600px]">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-full"
              style={{
                bottom: `${i * 30}px`,
                height: '2px',
                background:
                  'linear-gradient(90deg, rgba(255,107,153,0) 0%, rgba(255,107,153,0.3) 50%, rgba(255,107,153,0) 100%)',
                transform: `perspective(1000px) rotateX(75deg) translateZ(${
                  i * 3
                }px)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-8 rounded-xl backdrop-blur-sm bg-[#2A1B3D]/40 shadow-2xl border border-[#FF6B99]/30">
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00FFF0] to-[#FF71CE]">
              Vaporwave Ising Model
            </h2>
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                variant="contained"
                style={{
                  background: 'linear-gradient(to right, #B967FF, #FF6B99)',
                  color: 'white',
                }}
                startIcon={isPlaying ? <Pause /> : <Play />}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button
                onClick={handleReset}
                variant="contained"
                style={{
                  background: 'linear-gradient(to right, #FF71CE, #B967FF)',
                  color: 'white',
                }}
                startIcon={<RotateCcw />}
              >
                Reset
              </Button>
              <Button
                onClick={
                  isRecording ? handleStopRecording : handleStartRecording
                }
                variant="contained"
                style={{
                  background: isRecording
                    ? 'linear-gradient(to right, #FF0000, #FF6B99)'
                    : 'linear-gradient(to right, #FF6B99, #B967FF)',
                  color: 'white',
                }}
                startIcon={isRecording ? <StopCircle /> : <Video />}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6 bg-[#1A0B2E]/70 p-6 rounded-lg border border-[#FF71CE]/30">
            {/* Initial State Buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-[#FFD700] font-medium">
                  Initial State:
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={initialPattern === 'positive' ? 'contained' : 'outlined'}
                  style={{
                    flex: 1,
                    background:
                      initialPattern === 'positive'
                        ? 'linear-gradient(to right, #FF71CE, #B967FF)'
                        : 'transparent',
                    color: initialPattern === 'positive' ? 'white' : '#FF71CE',
                  }}
                  startIcon={<Plus className="w-5 h-5" />}
                  onClick={() => {
                    setInitialPattern('positive');
                    initializeGrid('positive');
                  }}
                >
                  All Spins Up
                </Button>
                <Button
                  variant={initialPattern === 'negative' ? 'contained' : 'outlined'}
                  style={{
                    flex: 1,
                    background:
                      initialPattern === 'negative'
                        ? 'linear-gradient(to right, #FF71CE, #B967FF)'
                        : 'transparent',
                    color: initialPattern === 'negative' ? 'white' : '#FF71CE',
                  }}
                  startIcon={<Minus className="w-5 h-5" />}
                  onClick={() => {
                    setInitialPattern('negative');
                    initializeGrid('negative');
                  }}
                >
                  All Spins Down
                </Button>
                <Button
                  variant={
                    initialPattern === 'checkerboard' ? 'contained' : 'outlined'
                  }
                  style={{
                    flex: 1,
                    background:
                      initialPattern === 'checkerboard'
                        ? 'linear-gradient(to right, #FF71CE, #B967FF)'
                        : 'transparent',
                    color: initialPattern === 'checkerboard' ? 'white' : '#FF71CE',
                  }}
                  startIcon={<GridIcon className="w-5 h-5" size={20} />}
                  onClick={() => {
                    setInitialPattern('checkerboard');
                    initializeGrid('checkerboard');
                  }}
                >
                  Checkerboard
                </Button>
                <Button
                  variant={initialPattern === 'random' ? 'contained' : 'outlined'}
                  style={{
                    flex: 1,
                    background:
                      initialPattern === 'random'
                        ? 'linear-gradient(to right, #FF71CE, #B967FF)'
                        : 'transparent',
                    color: initialPattern === 'random' ? 'white' : '#FF71CE',
                  }}
                  startIcon={<RefreshCcw className="w-5 h-5" />}
                  onClick={() => {
                    setInitialPattern('random');
                    initializeGrid('random');
                  }}
                >
                  Random
                </Button>
              </div>
            </div>

            {/* Grid Size */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#FF8C41]" />
                <label className="text-[#FF8C41] font-medium">
                  Grid Size: {size} x {size}
                </label>
              </div>
              <Slider
                value={size}
                onChange={handleGridSizeChange}
                min={10}
                max={69} // Maximum grid size set to 69
                step={1}
                style={{ color: '#FF8C41' }}
              />
            </div>

            {/* Simulation Speed */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#00FFF0]" />
                <label className="text-[#00FFF0] font-medium">
                  Simulation Speed: {(1000 / simulationSpeed).toFixed(1)}{' '}
                  updates/sec
                </label>
              </div>
              <Slider
                value={simulationSpeed}
                onChange={(e, value) => setSimulationSpeed(value)}
                min={10}
                max={500}
                step={10}
                style={{ color: '#00FFF0' }}
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-[#00FFF0]" />
                <label className="text-[#00FFF0] font-medium">
                  Temperature: {temperature.toFixed(2)}
                </label>
              </div>
              <Slider
                value={temperature}
                onChange={(e, value) => setTemperature(value)}
                min={0.1}
                max={5}
                step={0.1}
                style={{ color: '#00FFF0' }}
              />
            </div>

            {/* Coupling */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-[#FF71CE]" />
                <label className="text-[#FF71CE] font-medium">
                  Coupling: {coupling.toFixed(2)}
                </label>
              </div>
              <Slider
                value={coupling}
                onChange={(e, value) => setCoupling(value)}
                min={0}
                max={2}
                step={0.1}
                style={{ color: '#FF71CE' }}
              />
            </div>

            {/* External Field */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Magnet className="w-5 h-5 text-[#FFD700]" />
                <label className="text-[#FFD700] font-medium">
                  External Field: {externalField.toFixed(2)}
                </label>
              </div>
              <Slider
                value={externalField}
                onChange={(e, value) => setExternalField(value)}
                min={-2}
                max={2}
                step={0.1}
                style={{ color: '#FFD700' }}
              />
            </div>

            {/* Annealing */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-[#FF8C41]" />
                <label className="text-[#FF8C41] font-medium">
                  Annealing Rate: {annealingRate.toFixed(3)}
                </label>
              </div>
              <Slider
                value={annealingRate}
                onChange={(e, value) => setAnnealingRate(value)}
                min={-0.05}
                max={0.05}
                step={0.005}
                style={{ color: '#FF8C41' }}
              />
            </div>

            {/* Draw Mode */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-[#B967FF] font-medium">Draw Mode:</label>
                <Button
                  variant={drawMode === 'circle' ? 'contained' : 'outlined'}
                  style={{
                    background:
                      drawMode === 'circle'
                        ? 'linear-gradient(to right, #FF71CE, #B967FF)'
                        : 'transparent',
                    color: drawMode === 'circle' ? 'white' : '#FF71CE',
                  }}
                  startIcon={<Circle />}
                  onClick={() => setDrawMode('circle')}
                >
                  Circle
                </Button>
                <Button
                  variant={drawMode === 'square' ? 'contained' : 'outlined'}
                  style={{
                    background:
                      drawMode === 'square'
                        ? 'linear-gradient(to right, #FF71CE, #B967FF)'
                        : 'transparent',
                    color: drawMode === 'square' ? 'white' : '#FF71CE',
                  }}
                  startIcon={<Square />}
                  onClick={() => setDrawMode('square')}
                >
                  Square
                </Button>
              </div>
            </div>

            {/* Net Magnetization */}
            <div className="flex items-center gap-2 text-[#B967FF]">
              <div className="flex items-center gap-1">
                {magnetization >= 0 ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </div>
              <span className="font-medium">
                Net Magnetization: {magnetization.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Canvas and Chart */}
          <div className="flex flex-col md:flex-row gap-6">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="rounded-lg cursor-pointer shadow-2xl border border-[#FF71CE]/30"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            {/* Magnetization Chart */}
            <div className="flex-1">
              <Line
                data={{
                  labels: magnetizationHistory.map((_, i) => i),
                  datasets: [
                    {
                      label: 'Net Magnetization (%)',
                      data: magnetizationHistory,
                      borderColor: '#FF71CE',
                      backgroundColor: 'rgba(255, 113, 206, 0.2)',
                    },
                  ],
                }}
                options={{
                  scales: {
                    x: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Time Steps',
                        color: '#FFFFFF',
                      },
                      ticks: {
                        color: '#FFFFFF',
                      },
                    },
                    y: {
                      display: true,
                      title: {
                        display: true,
                        text: 'Magnetization (%)',
                        color: '#FFFFFF',
                      },
                      ticks: {
                        color: '#FFFFFF',
                      },
                    },
                  },
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IsingModel;
