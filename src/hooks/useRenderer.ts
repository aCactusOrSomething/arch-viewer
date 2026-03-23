import { useEffect, useRef } from "react";
import { Renderer } from "../renderer/Renderer";

export function useRenderer(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const rendererRef = useRef<Renderer | null>(null);


    useEffect(() => {
        if (!canvasRef.current) return;

        const renderer = new Renderer(canvasRef.current);
        renderer.init().then(() => {
            rendererRef.current = renderer;
            function loop() {
                renderer.render();
                requestAnimationFrame(loop);
            }
            requestAnimationFrame(loop);
        });

        return () => {
            rendererRef.current?.destroy();
        };
    }, [canvasRef]);

    return rendererRef;
}