
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import './App.css'

const stadiumGeometry = {
  'American Family Field': 'brewers',
  'Angel Stadium': 'angels',
  'Busch Stadium': 'cardinals',
  'Chase Field': 'diamondbacks',
  'Citi Field': 'mets',
  'Citizens Bank Park': 'phillies',
  'Comerica Park': 'tigers',
  'Coors Field': 'rockies',
  'Daikin Park': 'astros',
  'Estadio Alfredo Harp Helu': 'generic',
  'Fenway Park': 'red_sox',
  'Field of Dreams': 'generic',
  'Globe Life Field': 'rangers',
  'Great American Ball Park': 'reds',
  'Journey Bank Ballpark': 'generic',
  'Kauffman Stadium': 'royals',
  'Las Vegas Ballpark': 'generic',
  'Nationals Park': 'nationals',
  'Oracle Park': 'giants',
  'Oriole Park at Camden Yards': 'orioles',
  'PNC Park': 'pirates',
  'Petco Park': 'padres',
  'Progressive Field': 'guardians',
  'Rate Field': 'white_sox',
  'Rogers Centre': 'blue_jays',
  'Sutter Health Park': 'generic',
  'T-Mobile Park': 'mariners',
  'Target Field': 'twins',
  'Tropicana Field': 'rays',
  'Truist Park': 'braves',
  'UNIQLO Field at Dodger Stadium': 'dodgers',
  'Wrigley Field': 'cubs',
  'Yankee Stadium': 'yankees',
  'loanDepot park': 'marlins',
}

const stadiumAbbreviations = {
  'American Family Field': 'MIL',
  'Angel Stadium': 'LAA',
  'Busch Stadium': 'STL',
  'Chase Field': 'ARI',
  'Citi Field': 'NYM',
  'Citizens Bank Park': 'PHI',
  'Comerica Park': 'DET',
  'Coors Field': 'COL',
  'Daikin Park': 'HOU',
  'Fenway Park': 'BOS',
  'Globe Life Field': 'TEX',
  'Great American Ball Park': 'CIN',
  'Kauffman Stadium': 'KC',
  'Nationals Park': 'WSH',
  'Oracle Park': 'SF',
  'Oriole Park at Camden Yards': 'BAL',
  'PNC Park': 'PIT',
  'Petco Park': 'SD',
  'Progressive Field': 'CLE',
  'Rate Field': 'CWS',
  'Rogers Centre': 'TOR',
  'T-Mobile Park': 'SEA',
  'Target Field': 'MIN',
  'Tropicana Field': 'TB',
  'Truist Park': 'ATL',
  'UNIQLO Field at Dodger Stadium': 'LAD',
  'Wrigley Field': 'CHC',
  'Yankee Stadium': 'NYY',
  'loanDepot park': 'MIA',
  'Sutter Health Park': 'ATH',
}

function App() {
  const svgRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const simulatorSvgRef = useRef(null)
  const zoomTransformRef = useRef(d3.zoomIdentity)

  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity)

  const [hits, setHits] = useState([])
  const [stadiumData, setStadiumData] = useState([])
  const [selectedStadium, setSelectedStadium] = useState('American Family Field')

  const [filters, setFilters] = useState({
    home_run: true,
    double: true,
    triple: true,
  })

  const [selectedHit, setSelectedHit] = useState(null)
  const [selectedHitPosition, setSelectedHitPosition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('explorer')
  const [simStadium, setSimStadium] = useState(selectedStadium)
  const [exitVelocity, setExitVelocity] = useState(100)
  const [launchAngle, setLaunchAngle] = useState(28)
  const [hitDirection, setHitDirection] = useState(45)
  const [simulationResult, setSimulationResult] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const simulatorScalesRef = useRef(null)
  const [showSimulationResult, setShowSimulationResult] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/data/hits.json').then((res) => {
        if (!res.ok) throw new Error('Could not load hits')
        return res.json()
      }),
      fetch('/data/stadiums.json').then((res) => {
        if (!res.ok) throw new Error('Could not load stadium geometry')
        return res.json()
      }),
    ])
      .then(([hitData, fieldData]) => {
        setHits(hitData)
        setStadiumData(fieldData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const excludedStadiums = [
    'Estadio Alfredo Harp Helu',
    'Field of Dreams',
    'Journey Bank Ballpark',
    'Las Vegas Ballpark',
  ]

  const stadiumOptions = [...new Set(
    hits
      .map((hit) => hit.venue_name)
      .filter((name) => name && !excludedStadiums.includes(name))
  )].sort()

  const selectedHits = hits.filter(
    (hit) =>
      hit.venue_name === selectedStadium &&
      !excludedStadiums.includes(hit.venue_name)
  )

  const visibleHits = selectedHits.filter(
    (hit) => filters[hit.events]
  )

  const selectedTeam = stadiumGeometry[selectedStadium] || 'generic'

  const simTeam = stadiumGeometry[simStadium]

  const simStadiumData = stadiumData.filter(
    (point) => point.team === simTeam
  )

  const simFence = simStadiumData.filter(
    (point) => point.segment === 'outfield_outer'
  )

  const simHomePlate = simStadiumData.find(
    (point) => point.segment === 'home_plate'
  )

  const getFenceDistance = (direction) => {
    const dx = Math.sin(direction)
    const dy = -Math.cos(direction)

    let closestDistance = Infinity

    for (let i = 0; i < simFence.length; i++) {
      const a = simFence[i]
      const b = simFence[(i + 1) % simFence.length]

      const edgeX = b.x - a.x
      const edgeY = b.y - a.y

      const offsetX = a.x - simHomePlate.x
      const offsetY = a.y - simHomePlate.y

      const denominator = dx * edgeY - dy * edgeX

      if (Math.abs(denominator) < 0.000001) continue

      const distance =
        (offsetX * edgeY - offsetY * edgeX) / denominator

      const position =
        (offsetX * dy - offsetY * dx) / denominator

      if (
        distance >= 0 &&
        position >= 0 &&
        position <= 1
      ) {
        closestDistance = Math.min(closestDistance, distance)
      }
    }

    return closestDistance
  }

  const simulateHit = () => {
    if (
    exitVelocity === '' ||
    launchAngle === '' ||
    hitDirection === '' ||
    Number(exitVelocity) < 0 ||
    Number(exitVelocity) > 150 ||
    Number(launchAngle) < -90 ||
    Number(launchAngle) > 90 ||
    Number(hitDirection) < 0 ||
    Number(hitDirection) > 90
  ) {
    alert('Please enter valid values within the allowed ranges.');
    return;
  }
  if (!simHomePlate || simFence.length === 0) return

  setIsSimulating(true)
  setSimulationResult(null)
  setShowSimulationResult(false)

  const velocity = exitVelocity * 0.44704
  const angle = (launchAngle * Math.PI) / 180

  const direction = ((hitDirection - 45) * Math.PI) / 180

  const gravity = 9.81
  const airDensity = 1.20
  const ballMass = 0.145
  const ballRadius = 0.0366
  const dragCoefficient = 0.35
  const crossSection = Math.PI * ballRadius ** 2

  let horizontalVelocity = velocity * Math.cos(angle)
  let verticalVelocity = velocity * Math.sin(angle)

  let horizontalDistance = 0
  let height = 1
  let time = 0

  const dt = 0.005
  const trajectory = []

  while (height >= 0 && time < 10) {
    trajectory.push({
      distance: horizontalDistance,
      height,
      time,
    })

    const speed = Math.sqrt(
      horizontalVelocity ** 2 + verticalVelocity ** 2
    )

    const dragForce =
  0.5 *
  airDensity *
  dragCoefficient *
  crossSection *
  speed ** 2

  const dragAcceleration = dragForce / ballMass

  // Approximate upward lift from backspin.
  const liftCoefficient = 0.18

  const liftAcceleration =
      0.5 *
      airDensity *
      crossSection *
      speed ** 2 *
      liftCoefficient / ballMass

    const horizontalAcceleration =
      -dragAcceleration * (horizontalVelocity / speed) -
      liftAcceleration * (verticalVelocity / speed)

    const verticalAcceleration =
      -gravity -
      dragAcceleration * (verticalVelocity / speed) +
      liftAcceleration * (horizontalVelocity / speed)

    horizontalVelocity += horizontalAcceleration * dt
    verticalVelocity += verticalAcceleration * dt

    horizontalDistance += horizontalVelocity * dt
    height += verticalVelocity * dt

    time += dt
  }

  const distanceFeet = horizontalDistance * 3.28084

  // Convert the direction and estimated distance into field coordinates.
  const fieldScale = 1.35

  const landingX =
    simHomePlate.x +
    horizontalDistance * fieldScale * Math.sin(direction)

  const landingY =
    simHomePlate.y -
    horizontalDistance * fieldScale * Math.cos(direction)

  const directionFenceDistance = getFenceDistance(direction)

  const landingDistance = horizontalDistance * fieldScale

  const isHomeRun =
    landingDistance > directionFenceDistance

  setSimulationResult({
    distance: Math.round(distanceFeet),
    hangTime: time.toFixed(2),
    landingX,
    landingY,
    trajectory,
    isHomeRun,
    directionRadians: direction,
    stadium: simStadium,
    exitVelocity: exitVelocity,
    launchAngle: launchAngle,
    sprayAngle: hitDirection,
  })

  setIsSimulating(false)
}

  useEffect(() => {
    if (!simulatorSvgRef.current || !simStadiumData.length) return

    const svg = d3.select(simulatorSvgRef.current)
    svg.selectAll('*').remove()

    const width = 700
    const height = 700
    const padding = 35

    const xScale = d3
      .scaleLinear()
      .domain([
        d3.min(simStadiumData, (d) => d.x),
        d3.max(simStadiumData, (d) => d.x),
      ])
      .range([padding, width - padding])

    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(simStadiumData, (d) => d.y) - 70,
        d3.max(simStadiumData, (d) => d.y),
      ])
      .range([padding, height - padding])

    simulatorScalesRef.current = { xScale, yScale }

    const segments = [
      'outfield_outer',
      'outfield_inner',
      'infield_outer',
      'infield_inner',
      'foul_lines',
      'home_plate',
    ]

    segments.forEach((segment) => {
      const points = simStadiumData.filter(
        (d) => d.segment === segment
      )

      const line = d3
        .line()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y))
        .curve(d3.curveLinearClosed)

      svg
        .append('path')
        .datum(points)
        .attr('d', line)
        .attr('fill', segment.includes('outfield') ? '#166534' : 'none')
        .attr('fill-opacity', segment === 'outfield_outer' ? 0.5 : 0)
        .attr('stroke', segment === 'outfield_outer' ? '#86efac' : '#cbd5e1')
        .attr('stroke-width', segment === 'outfield_outer' ? 2.5 : 1.5)
    })

    // Mark home plate.
    svg
      .append('circle')
      .attr('cx', xScale(simHomePlate.x))
      .attr('cy', yScale(simHomePlate.y))
      .attr('r', 6)
      .attr('fill', '#f8fafc')
  })

  useEffect(() => {
    if (!svgRef.current || !stadiumData.length || !hits.length) return

    let teamGeometry = stadiumData.filter(
      (d) => d.team === selectedTeam
    )

    if (!teamGeometry.length) {
      teamGeometry = stadiumData.filter(
        (d) => d.team === 'generic'
      )
    }

    const filteredHits = hits.filter(
      (d) =>
        d.venue_name === selectedStadium &&
        filters[d.events] &&
        d.hc_x !== '' &&
        d.hc_y !== '' &&
        d.hc_x != null &&
        d.hc_y != null
    )

    const width = 700
    const height = 700
    const margin = 35
    const padding = 8

    const svg = d3.select(svgRef.current)

    svg.selectAll('*').remove()

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const allX = [
      ...teamGeometry.map((d) => +d.x),
      ...filteredHits.map((d) => +d.hc_x),
    ]

    const allY = [
      ...teamGeometry.map((d) => +d.y),
      ...filteredHits.map((d) => +d.hc_y),
    ]

    const xExtent = d3.extent(allX)
    const yExtent = d3.extent(allY)

    const xRange = xExtent[1] - xExtent[0]
    const yRange = yExtent[1] - yExtent[0]
    const maxRange = Math.max(xRange, yRange)

    const xCenter = (xExtent[0] + xExtent[1]) / 2
    const yCenter = (yExtent[0] + yExtent[1]) / 2

    const paddedRange = maxRange + padding * 2

    const xDomain = [
      xCenter - paddedRange / 2,
      xCenter + paddedRange / 2,
    ]

    const yDomain = [
      yCenter - paddedRange / 2,
      yCenter + paddedRange / 2,
    ]

    const x = d3
      .scaleLinear()
      .domain(xDomain)
      .range([margin, width - margin])

    const y = d3
      .scaleLinear()
      .domain(yDomain)
      .range([margin, height - margin])

    const plot = svg.append('g').attr('class', 'plot')

    const field = plot.append('g').attr('class', 'field')

    const segmentColors = {
      outfield_outer: '#315d43',
      outfield_inner: '#467b54',
      infield_outer: '#b69a72',
      infield_inner: '#c7a77e',
      foul_lines: '#ffffff',
      home_plate: '#ffffff',
    }

    const segments = d3.group(teamGeometry, (d) => d.segment)

    segments.forEach((points, segment) => {
      field
        .append('path')
        .datum(points)
        .attr(
          'd',
          d3
            .line()
            .x((d) => x(+d.x))
            .y((d) => y(+d.y))
        )
        .attr('fill', 'none')
        .attr('stroke', segmentColors[segment] || '#ffffff')
        .attr('stroke-width', segment === 'foul_lines' ? 2.5 : 1.8)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
    })

    const hitColor = {
      home_run: '#f04438',
      double: '#f5c542',
      triple: '#38bdf8',
    }

    const dots = plot.append('g').attr('class', 'hits')

    dots
      .selectAll('circle')
      .data(filteredHits)
      .join('circle')
      .attr('cx', (d) => x(+d.hc_x))
      .attr('cy', (d) => y(+d.hc_y))
      .attr('r', 4)
      .attr('fill', (d) => hitColor[d.events])
      .attr('stroke', '#111827')
      .attr('stroke-width', 0.7)
      .attr('opacity', 0.8)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
                const pointX = x(+d.hc_x)
        const pointY = y(+d.hc_y)

        setSelectedHit(d)
        setSelectedHitPosition({ x: pointX, y: pointY })
      })
      .on('mouseover', function () {
        d3.select(this).attr('r', 7).attr('opacity', 1)
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 4).attr('opacity', 0.8)
      })

      const zoom = d3
        .zoom()
        .scaleExtent([1, 8])
        .extent([[0, 0], [width, height]])
        .on('zoom', (event) => {
          plot.attr('transform', event.transform)
          zoomTransformRef.current = event.transform
          setZoomTransform(event.transform)
        })

      zoomBehaviorRef.current = zoom

      const initialZoom = d3.zoomIdentity
        .translate(-width * 0.075, -height * 0.075)
        .scale(1.15)

      svg.call(zoom)
      svg.call(zoom.transform, initialZoom)
  }, [hits, stadiumData, filters, selectedStadium, selectedTeam, activeTab])

  useEffect(() => {
    if (!simulationResult || !simulatorSvgRef.current) return
    if (!simulatorScalesRef.current) return

    const svg = d3.select(simulatorSvgRef.current)
    const { xScale, yScale } = simulatorScalesRef.current

    svg.selectAll('.flight-path, .simulated-ball, .landing-marker').remove()

    const startX = xScale(simHomePlate.x)
    const startY = yScale(simHomePlate.y)

    const endX = xScale(simulationResult.landingX)
    const endY = yScale(simulationResult.landingY)

    const trajectory = simulationResult.trajectory

    const pathData = trajectory.map((point) => ({
      x: xScale(
        simHomePlate.x +
        point.distance * 1.35 *
        Math.sin(simulationResult.directionRadians)
      ),
      y: yScale(
        simHomePlate.y -
        point.distance * 1.35 *
        Math.cos(simulationResult.directionRadians)
      ),
    }))

    const flightLine = d3
      .line()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveCatmullRom.alpha(0.5))

    const path = svg
      .append('path')
      .datum(pathData)
      .attr('class', 'flight-path')
      .attr('d', flightLine)
      .attr('fill', 'none')
      .attr('stroke', '#facc15')
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '6 5')

    const ball = svg
      .append('circle')
      .attr('class', 'simulated-ball')
      .attr('cx', startX)
      .attr('cy', startY)
      .attr('r', 7)
      .attr('fill', '#ef4444')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)

    const landingMarker = svg
      .append('circle')
      .attr('class', 'landing-marker')
      .attr('cx', endX)
      .attr('cy', endY)
      .attr('r', 7)
      .attr('fill', '#facc15')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('opacity', 0)

    const distanceLabel = svg
      .append('text')
      .attr('class', 'landing-distance-label')
      .attr('x', endX)
      .attr('y', endY - 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#facc15')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .text(`${simulationResult.distance} ft`)
      .attr('opacity', 0)

    ball
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attrTween('transform', function () {
        const node = this
        const totalLength = path.node().getTotalLength()

        return (t) => {
          const point = path.node().getPointAtLength(t * totalLength)

          d3.select(node)
            .attr('cx', point.x)
            .attr('cy', point.y - Math.sin(t * Math.PI) * 45)

          return null
        }
      })
      .on('end', () => {
        landingMarker
          .transition()
          .duration(3300)
          .attr('opacity', 1)

        distanceLabel
          .transition()
          .duration(3300)
          .attr('opacity', 1)
          .on('end', () => {
            setShowSimulationResult(true)
          })
      })

    return () => {
      ball.interrupt()
      landingMarker.interrupt()
    }
  }, [simulationResult])

  const toggleFilter = (eventType) => {
    setFilters((prev) => ({
      ...prev,
      [eventType]: !prev[eventType],
    }))

    setSelectedHit(null)
    setSelectedHitPosition(null)
  }

  const changeStadium = (event) => {
    setSelectedStadium(event.target.value)
    setSelectedHit(null)
    setSelectedHitPosition(null)
  }

  const countHits = (eventType) =>
    selectedHits.filter((hit) => hit.events === eventType).length

    const popupPosition = selectedHitPosition
    ? (() => {
        const [pointX, pointY] = zoomTransform.apply([
          selectedHitPosition.x,
          selectedHitPosition.y,
        ])

        const popupWidth = 230
        const popupHeight = 190

        let x = pointX + 15
        let y = pointY - popupHeight / 2

        if (x + popupWidth > 690) {
          x = pointX - popupWidth - 15
        }

        x = Math.max(10, Math.min(x, 700 - popupWidth - 10))
        y = Math.max(10, Math.min(y, 700 - popupHeight - 10))

        return { x, y }
      })()
    : null

  const zoomIn = () => {
    if (!zoomBehaviorRef.current || !svgRef.current) return

    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, 1.5)
  }

  const zoomOut = () => {
    if (!zoomBehaviorRef.current || !svgRef.current) return

    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, 1 / 1.5)
  }

  const resetZoom = () => {
    if (!zoomBehaviorRef.current || !svgRef.current) return

    const initialZoom = d3.zoomIdentity
      .translate(-700 * 0.075, -700 * 0.075)
      .scale(1.15)

    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, initialZoom)
  }

  if (loading) {
    return <div className="loading">Loading stadium data...</div>
  }

  if (error) {
    return <div className="loading">Error: {error}</div>
  }

  return (
    <main className="dashboard">
      <header className="header">
        <div className="eyebrow">What makes a Home Run a Home Run?</div>
        <h1>Extra Base Hits in 2026 MLB Season</h1>
      </header>

      <nav className="main-tabs">
        <button
          className={activeTab === 'explorer' ? 'active' : ''}
          onClick={() => setActiveTab('explorer')}
        >
          2026 Extra Base Hits
        </button>

        <button
          className={activeTab === 'simulator' ? 'active' : ''}
          onClick={() => setActiveTab('simulator')}
        >
          Home Run Simulator
        </button>
      </nav>

      {activeTab === 'explorer' && (
        <>
      <section className="stats">
        <div className="stat-card">
          <span className="stat-label">Total extra-base hits</span>
          <strong>{visibleHits.length.toLocaleString()}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-label">Home runs</span>
          <strong>{countHits('home_run').toLocaleString()}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-label">Doubles</span>
          <strong>{countHits('double').toLocaleString()}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-label">Triples</span>
          <strong>{countHits('triple').toLocaleString()}</strong>
        </div>
      </section>

      <section className="content">
        <aside className="sidebar">
          <div className="panel">
            <h2>Stadium</h2>

            <select
              className="stadium-select"
              value={selectedStadium}
              onChange={changeStadium}
            >
              {stadiumOptions.map((stadium) => (
                <option key={stadium} value={stadium}>
                  {stadium} ({stadiumAbbreviations[stadium] || 'N/A'})
                </option>
              ))}
            </select>

            <span className="stadium-location">
              {selectedHits.length.toLocaleString()} recorded extra-base hits
            </span>
          </div>

          <div className="panel">
            <h2>Hit type</h2>

            <button
              className={`filter ${filters.home_run ? 'active' : ''}`}
              onClick={() => toggleFilter('home_run')}
            >
              <span className="dot home-run-dot" />
              Home Runs
              <span className="filter-count">{countHits('home_run')}</span>
            </button>

            <button
              className={`filter ${filters.double ? 'active' : ''}`}
              onClick={() => toggleFilter('double')}
            >
              <span className="dot double-dot" />
              Doubles
              <span className="filter-count">{countHits('double')}</span>
            </button>

            <button
              className={`filter ${filters.triple ? 'active' : ''}`}
              onClick={() => toggleFilter('triple')}
            >
              <span className="dot triple-dot" />
              Triples
              <span className="filter-count">{countHits('triple')}</span>
            </button>
          </div>

          <div className="panel hint">
            <h2>Explore the field</h2>
            <p>
              Click any hit on the field to inspect its Statcast information.
            </p>
          </div>
        </aside>

        <section className="field-panel">
          <div className="field-header">
            <div>
              <h2>Hit distribution</h2>
              <span>{selectedStadium} • 2026</span>
            </div>

            <div className="field-legend">
              <span><i className="legend-home" /> HR</span>
              <span><i className="legend-double" /> 2B</span>
              <span><i className="legend-triple" /> 3B</span>
            </div>
          </div>

          <div className="field-container">
          <div className="zoom-controls">
            <button onClick={zoomIn} title="Zoom in">+</button>
            <button onClick={zoomOut} title="Zoom out">−</button>
            <button onClick={resetZoom} title="Reset zoom">
              Reset
            </button>
          </div>

          <svg ref={svgRef} className="stadium-svg" />

            {selectedHit && selectedHitPosition && (
              <div
                className="hit-popup"
                style={{
                left: `${(popupPosition.x / 700) * 100}%`,
                top: `${(popupPosition.y / 700) * 100}%`,
              }}
              >
                <div className="hit-popup-header">
                  <strong>
                    {selectedHit.events === 'home_run'
                      ? 'Home Run'
                      : selectedHit.events === 'double'
                        ? 'Double'
                        : 'Triple'}
                  </strong>

                  <button
                    className="hit-popup-close"
                    onClick={() => {
                      setSelectedHit(null)
                      setSelectedHitPosition(null)
                    }}
                  >
                    ×
                  </button>
                </div>

                <div className="hit-popup-content">
                  <div>
                    <span>Batter</span>
                    <strong>{selectedHit.batter_name || 'Unknown'}</strong>
                  </div>

                  <div>
                    <span>Pitcher</span>
                    <strong>{selectedHit.pitcher_name || 'Unknown'}</strong>
                  </div>

                  <div>
                    <span>Exit Velocity</span>
                    <strong>
                      {selectedHit.launch_speed
                        ? `${selectedHit.launch_speed} mph`
                        : 'N/A'}
                    </strong>
                  </div>

                  <div>
                    <span>Launch Angle</span>
                    <strong>
                      {selectedHit.launch_angle
                        ? `${selectedHit.launch_angle}°`
                        : 'N/A'}
                    </strong>
                  </div>

                  <div>
                    <span>Date</span>
                    <strong>{selectedHit.game_date}</strong>
                  </div>

                  <div>
                    <span>Game Type</span>
                    <strong>
                    {selectedHit.game_type === 'R'
                      ? 'Regular Season'
                      : ['D', 'L', 'F', 'W'].includes(selectedHit.game_type)
                        ? 'Postseason'
                        : selectedHit.game_type}
                  </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </section>
              </>
      )}

      {activeTab === 'simulator' && (
      <section className="simulator-layout">
        <div className="field-panel">
          <h2>Home Run Simulator</h2>
          <p>Adjust the hit conditions to see where the ball would land.</p>

          <div className="simulator-form">
            <label>
              Stadium
              <select
                value={simStadium}
                onChange={(e) => setSimStadium(e.target.value)}
              >
                {stadiumOptions.map((stadium) => (
                  <option key={stadium} value={stadium}>
                    {stadium} ({stadiumAbbreviations[stadium] || 'N/A'})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Exit Velocity (mph)
              <input
                type="number"
                value={exitVelocity}
                onChange={(e) => setExitVelocity(e.target.value)}
                min="50"
                max="125"
              />
            </label>

            <label>
              Launch Angle (degrees)
              <input
                type="number"
                value={launchAngle}
                onChange={(e) => setLaunchAngle(e.target.value)}
                min="-10"
                max="60"
              />
            </label>

            <label>
              Direction
              <input
                type="number"
                value={hitDirection}
                onChange={(e) => setHitDirection(e.target.value)}
                min="0"
                max="90"
              />
              <small>
                0° = Left field line | 45° = Center field | 90° = Right field line
              </small>
            </label>

            <button
              className="simulate-button"
              onClick={simulateHit}
              disabled={isSimulating}
            >
              {isSimulating ? 'Simulating...' : 'Simulate Hit'}
            </button>
          </div>
          {simulationResult && showSimulationResult && (
            <div className="simulation-results">
              <h3>Simulation Results</h3>

              <div className="result-cards">
                <div className="result-card">
                  <span>Projected Distance</span>
                  <strong>{simulationResult.distance} ft</strong>
                </div>

                <div className="result-card">
                  <span>Estimated Hang Time</span>
                  <strong>{simulationResult.hangTime} sec</strong>
                </div>
              </div>
              <div className="simulation-summary">
                <h4>Simulation Summary</h4>

                <div className="summary-details">
                  <div>
                    <span>Stadium</span>
                    <strong>{simulationResult.stadium}</strong>
                  </div>

                  <div>
                    <span>Exit Velocity</span>
                    <strong>{simulationResult.exitVelocity} mph</strong>
                  </div>

                  <div>
                    <span>Launch Angle</span>
                    <strong>{simulationResult.launchAngle}°</strong>
                  </div>

                  <div>
                    <span>Direction (degrees)</span>
                    <strong>{simulationResult.sprayAngle}°</strong>
                  </div>
                </div>
              </div>
              <div className={`home-run-result ${
                simulationResult.isHomeRun ? 'home-run' : 'not-home-run'
              }`}>
                <strong>
                  {simulationResult.isHomeRun
                    ? 'Home Run!'
                    : 'Not a Home Run'}
                </strong>
              </div>
            </div>
          )}
        </div>
        <div className="field-panel simulator-preview">
          <h2>Ball Flight Visualization</h2>
          <p>
            Run a simulation to see the projected flight path.
          </p>

          <svg
            ref={simulatorSvgRef}
            viewBox="0 0 700 700"
            className="simulator-field"
          />
        </div>
      </section>
    )}

      <footer className="footer">
        Data source: Baseball Savant Statcast • 2026
      </footer>
    </main>
  )
}

export default App