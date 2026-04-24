/// <reference lib="webworker" />

// Messages from main thread
type InMessage = { type: "start"; arrayBuffer: ArrayBuffer };

// Messages to main thread
type OutMessage =
  | { type: "ready"; totalTiles: number; thumbnail: Blob }
  | {
      type: "tile";
      face: Face;
      level: number;
      x: number;
      y: number;
      blob: Blob;
      progress: number;
    }
  | { type: "done" }
  | { type: "error"; message: string };

type Face = "front" | "right" | "back" | "left" | "top" | "bottom";
const FACES: Face[] = ["front", "right", "back", "left", "top", "bottom"];
const FACE_INDEX: Record<Face, number> = {
  front: 0,
  right: 1,
  back: 2,
  left: 3,
  top: 4,
  bottom: 5,
};

// Level config — tile size constant at 512px
const LEVELS = [
  { faceSize: 512, nbTiles: 1 },
  { faceSize: 1024, nbTiles: 2 },
  { faceSize: 2048, nbTiles: 4 },
];

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// PSV cubemap convention: x=forward, y=right, z=down
// Face direction vectors derived from PSV's textureCoordsToSphericalCoords
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_equirect;
uniform int u_face;

in vec2 v_uv;
out vec4 outColor;

const float PI = 3.14159265359;

vec3 dirForFace(int face, float u, float v) {
  if (face == 0) return vec3(1.0, u, v);       // front
  if (face == 1) return vec3(-u, 1.0, v);      // right
  if (face == 2) return vec3(-1.0, -u, v);     // back
  if (face == 3) return vec3(u, -1.0, v);      // left
  if (face == 4) return vec3(-v, -u, -1.0);    // top
  return vec3(v, -u, 1.0);                     // bottom
}

void main() {
  float u = 2.0 * v_uv.x - 1.0;
  float v = 1.0 - 2.0 * v_uv.y;  // flip Y for image orientation

  vec3 d = normalize(dirForFace(u_face, u, v));
  float yaw = atan(d.y, d.x);
  float pitch = -asin(d.z);

  vec2 uv = vec2(0.5 + yaw / (2.0 * PI), 0.5 - pitch / PI);
  outColor = texture(u_equirect, uv);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function post(msg: OutMessage, transfer?: Transferable[]) {
  (self as unknown as Worker).postMessage(msg, transfer ?? []);
}

async function generateTiles(arrayBuffer: ArrayBuffer) {
  // 1. Decode image
  const blob = new Blob([arrayBuffer]);
  const bitmap = await createImageBitmap(blob);

  if (bitmap.width !== bitmap.height * 2) {
    post({
      type: "error",
      message: `Obraz musi być 2:1 (equirectangular). Wymiary: ${bitmap.width}×${bitmap.height}`,
    });
    return;
  }

  // 2. Generate thumbnail (512x256 webp from equirect)
  const thumbCanvas = new OffscreenCanvas(512, 256);
  const thumbCtx = thumbCanvas.getContext("2d")!;
  thumbCtx.drawImage(bitmap, 0, 0, 512, 256);
  const thumbnail = await thumbCanvas.convertToBlob({ type: "image/webp", quality: 0.8 });

  const totalTiles = FACES.length * LEVELS.reduce((sum, l) => sum + l.nbTiles * l.nbTiles, 0);
  post({ type: "ready", totalTiles, thumbnail });

  // 4. Set up WebGL
  const canvas = new OffscreenCanvas(LEVELS[LEVELS.length - 1].faceSize, LEVELS[LEVELS.length - 1].faceSize);
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    post({ type: "error", message: "WebGL2 niedostępny" });
    return;
  }

  const program = createProgram(gl);
  gl.useProgram(program);

  // Fullscreen quad
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const posLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Upload equirect texture
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const uFace = gl.getUniformLocation(program, "u_face");
  const uEquirect = gl.getUniformLocation(program, "u_equirect");
  gl.uniform1i(uEquirect, 0);

  bitmap.close();

  // 5. Render every face × level, slice into tiles
  let rendered = 0;

  for (const face of FACES) {
    for (let levelIdx = 0; levelIdx < LEVELS.length; levelIdx++) {
      const { faceSize, nbTiles } = LEVELS[levelIdx];
      const tileSize = faceSize / nbTiles;

      canvas.width = faceSize;
      canvas.height = faceSize;
      gl.viewport(0, 0, faceSize, faceSize);

      gl.uniform1i(uFace, FACE_INDEX[face]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Slice rendered face into tiles
      for (let ty = 0; ty < nbTiles; ty++) {
        for (let tx = 0; tx < nbTiles; tx++) {
          const tileCanvas = new OffscreenCanvas(tileSize, tileSize);
          const ctx = tileCanvas.getContext("2d")!;
          ctx.drawImage(
            canvas,
            tx * tileSize,
            ty * tileSize,
            tileSize,
            tileSize,
            0,
            0,
            tileSize,
            tileSize,
          );
          const tileBlob = await tileCanvas.convertToBlob({
            type: "image/jpeg",
            quality: 0.85,
          });

          rendered++;
          post(
            {
              type: "tile",
              face,
              level: levelIdx,
              x: tx,
              y: ty,
              blob: tileBlob,
              progress: rendered / totalTiles,
            },
          );
        }
      }
    }
  }

  gl.deleteTexture(tex);
  gl.deleteBuffer(posBuf);
  gl.deleteVertexArray(vao);
  gl.deleteProgram(program);

  post({ type: "done" });
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  if (e.data.type === "start") {
    generateTiles(e.data.arrayBuffer).catch((err) => {
      post({ type: "error", message: err?.message ?? "Unknown error" });
    });
  }
};

export {};
