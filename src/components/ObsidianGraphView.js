import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { loadObsidianGraph } from '../tools/obsidianTools';
import { colors, fonts } from '../ui/tokens';

const EMPTY_GRAPH = { nodes: [], edges: [] };
const MIN_CANVAS_HEIGHT = 420;
const MIN_SCALE = 0.6;
const MAX_SCALE = 3;

function clampScale(scale) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function touchDistance(touches) {
  if (touches.length < 2) return 0;
  const deltaX = touches[1].pageX - touches[0].pageX;
  const deltaY = touches[1].pageY - touches[0].pageY;
  return Math.sqrt(deltaX ** 2 + deltaY ** 2);
}

function createNodePositions(nodes, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.max(40, Math.min(width, height) / 2 - 42);

  return new Map(nodes.map((node, index) => {
    if (index === 0) return [node.id, { x: centerX, y: centerY }];
    const progress = Math.sqrt(index / Math.max(1, nodes.length - 1));
    const angle = index * 2.399963;
    return [node.id, {
      x: centerX + Math.cos(angle) * maxRadius * progress,
      y: centerY + Math.sin(angle) * maxRadius * progress,
    }];
  }));
}

function GraphEdge({ from, to }) {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
  const angle = Math.atan2(deltaY, deltaX);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.edge,
        {
          left: (from.x + to.x - length) / 2,
          top: (from.y + to.y) / 2,
          width: length,
          transform: [{ rotateZ: `${angle}rad` }],
        },
      ]}
    />
  );
}

export function ObsidianGraphView() {
  const [graph, setGraph] = useState(EMPTY_GRAPH);
  const [selectedNode, setSelectedNode] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 320, height: MIN_CANVAS_HEIGHT });
  const [state, setState] = useState({ loading: true, error: null });
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const viewportRef = useRef(viewport);
  const gestureStartRef = useRef(null);

  const updateViewport = useCallback(nextViewport => {
    viewportRef.current = nextViewport;
    setViewport(nextViewport);
  }, []);

  const panResponderRef = useRef(null);
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: event => event.nativeEvent.touches.length > 1,
      onMoveShouldSetPanResponder: (event, gestureState) => (
        event.nativeEvent.touches.length > 1
        || Math.abs(gestureState.dx) > 3
        || Math.abs(gestureState.dy) > 3
      ),
      onPanResponderGrant: event => {
        const touches = event.nativeEvent.touches;
        gestureStartRef.current = {
          ...viewportRef.current,
          distance: touchDistance(touches),
        };
      },
      onPanResponderMove: (event, gestureState) => {
        const touches = event.nativeEvent.touches;
        let start = gestureStartRef.current;
        if (!start) {
          start = { ...viewportRef.current, distance: touchDistance(touches) };
          gestureStartRef.current = start;
        }

        if (touches.length > 1) {
          const distance = touchDistance(touches);
          if (!start.distance) {
            gestureStartRef.current = { ...viewportRef.current, distance };
            return;
          }
          updateViewport({
            scale: clampScale(start.scale * (distance / start.distance)),
            x: start.x,
            y: start.y,
          });
          return;
        }

        updateViewport({
          scale: start.scale,
          x: start.x + gestureState.dx,
          y: start.y + gestureState.dy,
        });
      },
      onPanResponderRelease: () => {
        gestureStartRef.current = null;
      },
      onPanResponderTerminate: () => {
        gestureStartRef.current = null;
      },
    });
  }
  const panHandlers = panResponderRef.current.panHandlers;

  const changeScale = useCallback(delta => {
    updateViewport({ ...viewportRef.current, scale: clampScale(viewportRef.current.scale + delta) });
  }, [updateViewport]);

  const resetViewport = useCallback(() => {
    updateViewport({ scale: 1, x: 0, y: 0 });
  }, [updateViewport]);

  const refresh = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const nextGraph = await loadObsidianGraph();
      setGraph(nextGraph);
      setSelectedNode(nextGraph.nodes[0] ?? null);
      setState({ loading: false, error: null });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadObsidianGraph()
      .then(nextGraph => {
        if (!active) return;
        setGraph(nextGraph);
        setSelectedNode(nextGraph.nodes[0] ?? null);
        setState({ loading: false, error: null });
      })
      .catch(error => {
        if (active) setState({ loading: false, error: error.message });
      });
    return () => {
      active = false;
    };
  }, []);

  const positions = useMemo(
    () => createNodePositions(graph.nodes, canvasSize.width, canvasSize.height),
    [canvasSize, graph.nodes],
  );

  if (state.loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={colors.textPrimary} />
        <Text style={styles.stateText}>Leyendo enlaces del vault…</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.errorText}>{state.error}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={refresh} style={styles.actionButton}>
          <Text style={styles.actionText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.title}>Grafo Obsidian</Text>
          <Text style={styles.summary}>{graph.nodes.length} notas · {graph.edges.length} enlaces</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={refresh} style={styles.actionButton}>
          <Text style={styles.actionText}>Recargar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.graphToolbar}>
        <Text style={styles.gestureHint}>Pellizca para ampliar · arrastra para mover</Text>
        <View style={styles.zoomControls}>
          <TouchableOpacity accessibilityLabel="Alejar grafo" accessibilityRole="button" onPress={() => changeScale(-0.2)} style={styles.zoomButton}>
            <Text style={styles.zoomButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Restablecer grafo" accessibilityRole="button" onPress={resetViewport} style={styles.zoomResetButton}>
            <Text style={styles.zoomScale}>{Math.round(viewport.scale * 100)}%</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityLabel="Acercar grafo" accessibilityRole="button" onPress={() => changeScale(0.2)} style={styles.zoomButton}>
            <Text style={styles.zoomButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        {...panHandlers}
        onLayout={event => setCanvasSize({
          width: event.nativeEvent.layout.width,
          height: Math.max(MIN_CANVAS_HEIGHT, event.nativeEvent.layout.height),
        })}
        style={styles.canvas}
      >
        <View style={[styles.graphPlane, { transform: [
          { translateX: viewport.x },
          { translateY: viewport.y },
          { scale: viewport.scale },
        ] }]}> 
          {graph.edges.map((edge, index) => {
            const from = positions.get(edge.source);
            const to = positions.get(edge.target);
            return from && to ? <GraphEdge from={from} key={`${edge.source}-${edge.target}-${index}`} to={to} /> : null;
          })}
          {graph.nodes.map((node, index) => {
            const position = positions.get(node.id);
            const selected = selectedNode?.id === node.id;
            return (
              <TouchableOpacity
                accessibilityLabel={`Nota ${node.label}`}
                accessibilityRole="button"
                key={node.id}
                onPress={() => setSelectedNode(node)}
                style={[
                  styles.node,
                  node.unresolved && styles.nodeUnresolved,
                  selected && styles.nodeSelected,
                  { left: position.x - 7, top: position.y - 7 },
                ]}
              >
                {(selected || index < 14) && (
                  <Text numberOfLines={1} style={styles.nodeLabel}>{node.label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.selectionCard}>
        <Text style={styles.selectionLabel}>Nota seleccionada</Text>
        <Text numberOfLines={2} style={styles.selectionPath}>
          {selectedNode?.id?.replace(/^unresolved:/, '') ?? 'Ninguna'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.surfacePrimary },
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  stateText: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 13 },
  errorText: { color: colors.statusError, fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 18, fontWeight: '700' },
  summary: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12, marginTop: 4 },
  actionButton: { minHeight: 44, justifyContent: 'center', borderColor: colors.borderSubtle, borderWidth: 1, borderRadius: 4, paddingHorizontal: 14 },
  actionText: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 12, fontWeight: '700' },
  graphToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  gestureHint: { flex: 1, color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 10, paddingRight: 8 },
  zoomControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: 4 },
  zoomButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomButtonText: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 20 },
  zoomResetButton: { minWidth: 58, height: 44, alignItems: 'center', justifyContent: 'center', borderLeftColor: colors.borderSubtle, borderRightColor: colors.borderSubtle, borderLeftWidth: 1, borderRightWidth: 1 },
  zoomScale: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 11, fontWeight: '700' },
  canvas: { flex: 1, minHeight: MIN_CANVAS_HEIGHT, overflow: 'hidden', backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.textPrimary, borderLeftWidth: 2, borderRadius: 4 },
  graphPlane: { ...StyleSheet.absoluteFillObject },
  edge: { position: 'absolute', height: 1, backgroundColor: colors.borderSubtle },
  node: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.textPrimary, borderColor: colors.surfaceSecondary, borderWidth: 2 },
  nodeUnresolved: { opacity: 0.35 },
  nodeSelected: { width: 18, height: 18, borderRadius: 9, borderColor: colors.statusSuccess, borderWidth: 3 },
  nodeLabel: { position: 'absolute', left: 12, top: -4, width: 92, color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 9 },
  selectionCard: { marginTop: 12, padding: 12, backgroundColor: colors.surfaceSecondary, borderLeftColor: colors.statusSuccess, borderLeftWidth: 2, borderRadius: 4 },
  selectionLabel: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 10, textTransform: 'uppercase' },
  selectionPath: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 13, marginTop: 4 },
});
