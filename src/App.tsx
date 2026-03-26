import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  MapPin, 
  Maximize2, 
  Download, 
  FileJson, 
  Trash2, 
  X, 
  Move,
  Save,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import 'pannellum/build/pannellum.css';

// @ts-ignore
import pannellum from 'pannellum';

interface SceneLink {
  targetId: string;
  pitch: number;
  yaw: number;
}

interface Hotspot {
  id: string;
  name: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  imageData: string; // Base64 or URL
  type: 'image' | 'video';
  links?: SceneLink[];
}

interface KanbanRow {
  id: string;
  todo: string;
  progress: string;
  done: string;
}

const App: React.FC = () => {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [sitePlan, setSitePlan] = useState<string | null>(null);
  const [kanbanData, setKanbanData] = useState<KanbanRow[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const sitePlanRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // Xử lý nạp ảnh mặt bằng
  const handleSitePlanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSitePlan(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Xử lý nạp ảnh 360
  const handlePanoramaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files as FileList).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newHotspot: Hotspot = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name.split('.')[0],
            x: 10, // Mặc định góc trên trái
            y: 10,
            imageData: event.target?.result as string,
            type: file.type.includes('video') ? 'video' : 'image',
            links: []
          };
          setHotspots(prev => [...prev, newHotspot]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Xử lý kéo thả Pin trên mặt bằng
  const handleMouseDown = (id: string) => {
    setIsDragging(true);
    setDraggedId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && draggedId && sitePlanRef.current) {
      const rect = sitePlanRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setHotspots(prev => prev.map(h => 
        h.id === draggedId ? { ...h, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : h
      ));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedId(null);
  };

  // Xóa điểm
  const deleteHotspot = (id: string) => {
    setHotspots(prev => prev.filter(h => h.id !== id));
    if (activeHotspot?.id === id) setActiveHotspot(null);
  };

  // Đổi tên điểm
  const renameHotspot = (id: string, newName: string) => {
    setHotspots(prev => prev.map(h => h.id === id ? { ...h, name: newName } : h));
  };

  // Kanban Logic
  const addKanbanRow = () => {
    const newRow: KanbanRow = {
      id: Math.random().toString(36).substr(2, 9),
      todo: '',
      progress: '',
      done: ''
    };
    setKanbanData(prev => [...prev, newRow]);
  };

  const updateKanbanRow = (id: string, field: keyof KanbanRow, value: string) => {
    setKanbanData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const deleteKanbanRow = (id: string) => {
    setKanbanData(prev => prev.filter(row => row.id !== id));
  };

  // Persistence
  useEffect(() => {
    const savedKanban = localStorage.getItem('binh_an_kanban_data');
    if (savedKanban) {
      try {
        setKanbanData(JSON.parse(savedKanban));
      } catch (e) {
        console.error("Error loading kanban data", e);
      }
    } else {
      setKanbanData([
        { id: '1', todo: '', progress: '', done: '' },
        { id: '2', todo: '', progress: '', done: '' },
        { id: '3', todo: '', progress: '', done: '' }
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('binh_an_kanban_data', JSON.stringify(kanbanData));
  }, [kanbanData]);

  // Export JSON
  const exportJSON = () => {
    const cleanHotspots = hotspots.map(h => ({
      ...h,
      imageData: `./${h.name.replace(/\s+/g, '_')}.jpg`
    }));
    const data = { 
      sitePlan: sitePlan ? './siteplan.jpg' : null, 
      hotspots: cleanHotspots 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_data.json';
    a.click();
  };

  // Import JSON
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.sitePlan) setSitePlan(data.sitePlan);
          if (data.hotspots) setHotspots(data.hotspots);
        } catch (err) {
          alert('File JSON không hợp lệ');
        }
      };
      reader.readAsText(file);
    }
  };

  // Export Single HTML (Pannellum Review)
  const exportCombineHTML = () => {
    const kanbanHtml = `
        <table class="w-full text-[8px] md:text-[10px] border-collapse table-fixed">
            <thead>
                <tr class="text-zinc-600">
                    <th style="background-color: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; padding: 4px; text-align: center; font-weight: bold;">To do</th>
                    <th style="background-color: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; padding: 4px; text-align: center; font-weight: bold;">In progress</th>
                    <th style="background-color: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; padding: 4px; text-align: center; font-weight: bold;">Done</th>
                </tr>
            </thead>
            <tbody>
                ${kanbanData.map(row => `
                    <tr>
                        <td style="background-color: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; padding: 4px; vertical-align: top; white-space: pre-wrap;">${row.todo}</td>
                        <td style="background-color: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; padding: 4px; vertical-align: top; white-space: pre-wrap;">${row.progress}</td>
                        <td style="background-color: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; padding: 4px; vertical-align: top; white-space: pre-wrap;">${row.done}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Riviera Alba Project 360° Review</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
    <style>
        .pnlm-hotspot-base { cursor: pointer; }
        #panorama-viewer { width: 100%; height: 100%; background: #000; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
    </style>
</head>
<body class="bg-zinc-950 text-zinc-100 font-sans overflow-hidden h-screen flex flex-col">
    <!-- Header - Title Bar -->
    <header class="w-full bg-white border-b border-zinc-200 p-3 md:p-4 flex items-center justify-between z-20 shrink-0 text-zinc-900">
        <div class="flex items-center gap-3">
            <img src="https://binhanshipping.vn/wp-content/uploads/2024/07/cropped-logo-binh-an.webp" class="h-8 md:h-10 w-auto object-contain">
            <h1 class="text-xs md:text-base font-extrabold tracking-tight leading-tight">Riviera Alba Project 360° Review</h1>
        </div>
        <div class="flex flex-col items-end">
            <span class="text-[9px] text-zinc-400 lowercase">created date: march 3, 2026</span>
            <span class="text-[9px] text-zinc-400 lowercase">created by: bao le</span>
        </div>
    </header>

    <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
        <!-- Main Content Area -->
        <main class="flex-1 relative bg-zinc-950 overflow-hidden flex items-center justify-center order-1 md:order-2">
            <div id="site-plan-wrapper" class="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden hidden">
                <img id="site-plan-img" src="" class="max-w-full max-h-[60vh] md:max-h-[90vh] object-contain select-none">
                <div id="pins-container"></div>
            </div>
            <div id="loading-state" class="text-center space-y-4">
                <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p class="text-zinc-500 text-sm font-medium">Đang tải dữ liệu dự án...</p>
            </div>
        </main>

        <!-- Sidebar / Bottom Panel -->
        <aside class="w-full md:w-80 bg-white border-t md:border-t-0 md:border-r border-zinc-200 flex flex-col order-2 md:order-1 overflow-hidden h-[35vh] md:h-full text-zinc-900">
            <div class="flex flex-row md:flex-col h-full overflow-hidden">
                <!-- Hotspots List -->
                <section class="w-1/4 md:w-full border-r md:border-r-0 md:border-b border-zinc-100 flex flex-col overflow-hidden">
                    <div class="p-2 md:p-3 border-b border-zinc-50 bg-zinc-50/50">
                        <h2 class="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Điểm</h2>
                    </div>
                    <div id="hotspot-list" class="flex-1 overflow-y-auto p-1 md:p-3 space-y-1"></div>
                </section>

                <!-- Kanban Section -->
                <section class="w-3/4 md:w-full flex flex-col overflow-hidden">
                    <div class="p-2 md:p-3 border-b border-zinc-50 bg-zinc-50/50">
                        <h2 class="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Danh Mục</h2>
                    </div>
                    <div id="kanban-container" class="flex-1 overflow-auto p-1 md:p-3">
                        <div class="rounded-lg border border-zinc-200 overflow-hidden">
                            ${kanbanHtml}
                        </div>
                    </div>
                </section>
            </div>
        </aside>
    </div>

    <!-- 360 Viewer Modal -->
    <div id="viewer-modal" class="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-8 bg-black/90 backdrop-blur-md hidden opacity-0 transition-opacity duration-300">
        <div class="relative w-full h-full bg-zinc-900 rounded-xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
            <!-- Modal Header -->
            <div class="p-3 md:p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
                <div class="flex items-center gap-3">
                    <div class="p-1.5 md:p-2 bg-emerald-500/20 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                    </div>
                    <div>
                        <h2 id="active-name" class="text-xs md:text-sm font-bold text-white">Tên điểm</h2>
                        <p class="text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-widest font-bold">360° Panorama View</p>
                    </div>
                </div>
                <button onclick="closeViewer()" class="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <!-- Viewer Content -->
            <div class="flex-1 relative flex flex-col md:flex-row overflow-hidden">
                <div id="panorama-viewer" class="flex-1 bg-black min-h-[40vh]"></div>
                
                <!-- Internal List -->
                <div class="w-full md:w-64 bg-zinc-900/80 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/5 p-3 md:p-4 overflow-y-auto h-[30vh] md:h-full">
                    <h3 class="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 md:mb-4">Chuyển nhanh điểm nhìn</h3>
                    <div id="modal-hotspot-list" class="grid grid-cols-2 md:grid-cols-1 gap-2"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let projectData = null;
        let viewer = null;

        async function init() {
            try {
                const response = await fetch('project_data.json');
                if (!response.ok) throw new Error('Không tìm thấy project_data.json');
                projectData = await response.json();
                
                document.getElementById('loading-state').classList.add('hidden');
                document.getElementById('site-plan-wrapper').classList.remove('hidden');
                
                renderUI();
            } catch (e) {
                console.error(e);
                document.getElementById('loading-state').innerHTML = \`
                    <div class="text-rose-500 font-bold">Lỗi nạp dữ liệu</div>
                    <p class="text-zinc-500 text-xs mt-2">Đảm bảo file project_data.json nằm cùng thư mục với file này.</p>
                \`;
            }
        }

        function renderUI() {
            const list = document.getElementById('hotspot-list');
            const modalList = document.getElementById('modal-hotspot-list');
            const pins = document.getElementById('pins-container');
            const sitePlanImg = document.getElementById('site-plan-img');
            
            if (projectData.sitePlan) sitePlanImg.src = projectData.sitePlan;

            projectData.hotspots.forEach(h => {
                // Sidebar Item
                const item = document.createElement('div');
                item.className = 'flex items-center gap-1 md:gap-2.5 p-1 md:p-2.5 rounded-lg border bg-zinc-50 border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-all group';
                item.innerHTML = \`
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 group-hover:text-emerald-600"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span class="text-[9px] md:text-xs font-medium text-zinc-700 truncate">\${h.name}</span>
                \`;
                item.onclick = () => openViewer(h);
                list.appendChild(item);

                // Modal Item
                const modalItem = document.createElement('div');
                modalItem.className = 'flex items-center gap-2 p-2 md:p-3 rounded-lg md:rounded-xl border bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-emerald-500 hover:bg-emerald-500/10 cursor-pointer transition-all';
                modalItem.innerHTML = \`
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    <span class="text-[10px] md:text-xs font-bold truncate">\${h.name}</span>
                \`;
                modalItem.onclick = () => openViewer(h);
                modalList.appendChild(modalItem);

                // Map Pin
                const pin = document.createElement('div');
                pin.className = 'absolute w-4 h-4 -ml-2 -mt-4 cursor-pointer z-20 flex flex-col items-center';
                pin.style.left = h.x + '%';
                pin.style.top = h.y + '%';
                pin.innerHTML = \`
                    <div class="p-0.5 rounded-full border bg-orange-600/50 border-white shadow-lg hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                    <div class="mt-0.5 px-1 py-0.5 bg-zinc-900/60 backdrop-blur-sm rounded text-[8px] font-bold text-white whitespace-nowrap border border-white/10 shadow-xl">\${h.name}</div>
                \`;
                pin.onclick = () => openViewer(h);
                pins.appendChild(pin);
            });
        }

        function openViewer(h) {
            const modal = document.getElementById('viewer-modal');
            modal.classList.remove('hidden');
            setTimeout(() => modal.classList.remove('opacity-0'), 10);
            
            document.getElementById('active-name').innerText = h.name;
            
            if (viewer) viewer.destroy();
            
            viewer = pannellum.viewer('panorama-viewer', {
                type: 'equirectangular',
                panorama: h.imageData,
                autoLoad: true,
                showControls: true,
                hotSpots: (h.links || []).map(link => {
                    const target = projectData.hotspots.find(item => item.id === link.targetId);
                    return {
                        pitch: link.pitch,
                        yaw: link.yaw,
                        type: 'info',
                        text: target ? target.name : 'Liên kết',
                        clickHandlerFunc: () => openViewer(target)
                    };
                })
            });
        }

        function closeViewer() {
            const modal = document.getElementById('viewer-modal');
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                if (viewer) viewer.destroy();
                viewer = null;
            }, 300);
        }

        window.onload = init;
    </script>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index_Combine.html';
    a.click();
  };

  // Khởi tạo Pannellum khi mở modal
  useEffect(() => {
    if (activeHotspot && (window as any).pannellum) {
      const timeout = setTimeout(() => {
        try {
          // Luôn lấy dữ liệu mới nhất từ mảng hotspots
          const currentData = hotspots.find(h => h.id === activeHotspot.id) || activeHotspot;
          
          const config: any = {
            type: 'equirectangular',
            panorama: currentData.imageData,
            autoLoad: true,
            showControls: true,
            hotSpots: (currentData.links || []).map(link => {
              const target = hotspots.find(h => h.id === link.targetId);
              return {
                pitch: link.pitch,
                yaw: link.yaw,
                type: 'info',
                text: target?.name || 'Liên kết',
                clickHandlerFunc: () => {
                  if (target) setActiveHotspot(target);
                }
              };
            })
          };

          if (viewerRef.current) {
            viewerRef.current.destroy();
          }
          viewerRef.current = (window as any).pannellum.viewer('panorama-viewer', config);
        } catch (e) {
          console.error("Pannellum error:", e);
        }
      }, 100);
      return () => {
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
        clearTimeout(timeout);
      };
    }
  }, [activeHotspot?.id, hotspots]);

  // Xử lý Drop vào 360 Viewer
  const handleDropTo360 = (e: React.DragEvent) => {
    e.preventDefault();
    const targetId = e.dataTransfer.getData('hotspotId');
    if (!targetId || !activeHotspot || targetId === activeHotspot.id) return;

    if (viewerRef.current) {
      // Lấy tọa độ pitch/yaw từ vị trí chuột
      const coords = viewerRef.current.mouseEventToCoords(e.nativeEvent);
      if (!coords) return;
      const [pitch, yaw] = coords;

      const newLink: SceneLink = { targetId, pitch, yaw };
      
      // Cập nhật mảng hotspots
      setHotspots(prev => prev.map(h => {
        if (h.id === activeHotspot.id) {
          return { ...h, links: [...(h.links || []), newLink] };
        }
        return h;
      }));

      // Cập nhật activeHotspot để viewer nhận biết thay đổi ngay lập tức
      const updatedActive = { ...activeHotspot, links: [...(activeHotspot.links || []), newLink] };
      setActiveHotspot(updatedActive);

      // Thêm hotspot vào viewer hiện tại để phản hồi tức thì
      const target = hotspots.find(h => h.id === targetId);
      try {
        viewerRef.current.addHotSpot({
          pitch,
          yaw,
          type: 'info',
          text: target?.name || 'Điểm mới',
          clickHandlerFunc: () => {
            if (target) setActiveHotspot(target);
          }
        });
      } catch (err) {
        console.warn("Could not add hotspot immediately, will be added on re-render");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Header - Title Bar (Full width) */}
      <header className="w-full bg-white border-b border-zinc-200 p-3 md:p-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src="https://binhanshipping.vn/wp-content/uploads/2024/07/cropped-logo-binh-an.webp" 
            alt="Logo" 
            className="h-8 md:h-10 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xs md:text-base font-extrabold tracking-tight text-zinc-900 leading-tight">
            Riviera Alba Project 360° Review
          </h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] text-zinc-400 lowercase">created date: march 3, 2026</span>
            <span className="text-[9px] text-zinc-400 lowercase">created by: bao le</span>
          </div>
          <div className="flex gap-1.5 md:gap-2">
            <button onClick={exportJSON} className="p-1.5 md:p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 transition-colors" title="Export JSON">
              <FileJson className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <label className="p-1.5 md:p-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 cursor-pointer transition-colors" title="Import JSON">
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <input type="file" className="hidden" accept=".json" onChange={importJSON} />
            </label>
            <button 
              onClick={exportCombineHTML}
              className="px-2 md:px-3 py-1.5 md:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] md:text-xs font-bold text-white transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-1.5 md:gap-2"
            >
              <Save className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">Export HTML</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main Content Area (Middle on Mobile, Right on Desktop) */}
        <main className="flex-1 relative bg-zinc-950 overflow-hidden flex items-center justify-center order-1 md:order-2">
          {sitePlan ? (
            <div 
              ref={sitePlanRef}
              className="relative max-w-full max-h-full shadow-2xl rounded-lg overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img 
                src={sitePlan} 
                alt="Site Plan" 
                className="max-w-full max-h-[60vh] md:max-h-[90vh] object-contain select-none"
                draggable={false}
              />
              {/* Pins on Map */}
              {hotspots.map(h => (
                <motion.div
                  key={h.id}
                  initial={false}
                  animate={{ left: `${h.x}%`, top: `${h.y}%` }}
                  className={`absolute w-4 h-4 -ml-2 -mt-4 cursor-pointer z-20 flex flex-col items-center`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(h.id);
                  }}
                  onClick={(e) => {
                    if (!isDragging) setActiveHotspot(h);
                  }}
                >
                  <div className={`p-0.5 rounded-full border shadow-lg transition-transform hover:scale-110 ${activeHotspot?.id === h.id ? 'bg-orange-600 border-white' : 'bg-orange-600/50 border-white'}`}>
                    <MapPin className={`w-2.5 h-2.5 text-white`} />
                  </div>
                  <div className="mt-0.5 px-1 py-0.5 bg-zinc-900/60 backdrop-blur-sm rounded text-[8px] font-bold text-white whitespace-nowrap border border-white/10">
                    {h.name}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                <Upload className="w-6 h-6 md:w-10 md:h-10 text-zinc-700" />
              </div>
              <div>
                <h3 className="text-sm md:text-lg font-bold text-zinc-400">Chưa có mặt bằng</h3>
                <p className="text-zinc-600 text-[10px] md:text-sm">Hãy tải lên hình ảnh mặt bằng dự án để bắt đầu</p>
                <div className="mt-4 flex justify-center gap-2 md:hidden">
                   <label className="px-3 py-1.5 bg-emerald-600 rounded-lg text-[10px] font-bold text-white cursor-pointer">
                      Tải Mặt Bằng
                      <input type="file" className="hidden" accept="image/*" onChange={handleSitePlanUpload} />
                   </label>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Sidebar / Bottom Panel (Bottom on Mobile, Left on Desktop) */}
        <aside className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-r border-zinc-200 flex flex-col order-2 md:order-1 overflow-hidden h-[35vh] md:h-full">
          <div className="flex flex-row md:flex-col h-full overflow-hidden">
            {/* Hotspots List (1/4 on Mobile, Full width on Desktop) */}
            <section className="w-1/4 md:w-full border-r md:border-r-0 md:border-b border-zinc-100 flex flex-col overflow-hidden">
              <div className="p-2 md:p-3 border-b border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
                <h2 className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Điểm ({hotspots.length})</h2>
                <label className="md:hidden cursor-pointer">
                  <Plus className="w-3 h-3 text-blue-600" />
                  <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={handlePanoramaUpload} />
                </label>
              </div>
              <div className="flex-1 overflow-y-auto p-1 md:p-3 space-y-1">
                {/* Desktop Upload Buttons */}
                <div className="hidden md:grid grid-cols-1 gap-1.5 mb-4">
                  <label className="flex items-center gap-2.5 p-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg cursor-pointer transition-all border border-zinc-200">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-medium text-zinc-700">Tải Mặt Bằng</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleSitePlanUpload} />
                  </label>
                  <label className="flex items-center gap-2.5 p-2 bg-zinc-50 hover:bg-zinc-100 rounded-lg cursor-pointer transition-all border border-zinc-200">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-medium text-zinc-700">Thêm Ảnh 360°</span>
                    <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={handlePanoramaUpload} />
                  </label>
                </div>

                {hotspots.map(h => (
                  <div 
                    key={h.id} 
                    className={`group flex items-center gap-1 md:gap-2.5 p-1 md:p-2.5 rounded-lg border transition-all ${activeHotspot?.id === h.id ? 'bg-emerald-50 border-emerald-500' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'}`}
                  >
                    <div className="cursor-move text-zinc-400 group-hover:text-zinc-600 hidden md:block" onMouseDown={() => handleMouseDown(h.id)}>
                      <Move className="w-3 h-3" />
                    </div>
                    <input 
                      className={`bg-transparent text-[9px] md:text-xs font-medium outline-none flex-1 min-w-0 text-zinc-700`}
                      value={h.name}
                      onChange={(e) => renameHotspot(h.id, e.target.value)}
                    />
                    <div className="flex items-center gap-0.5 md:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setActiveHotspot(h)}
                        className="p-1 rounded-md hover:bg-zinc-200 text-emerald-600"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => deleteHotspot(h.id)}
                        className="p-1 rounded-md hover:bg-zinc-200 text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Kanban Section (3/4 on Mobile, Full width on Desktop) */}
            <section className="w-3/4 md:w-full flex flex-col overflow-hidden">
              <div className="p-2 md:p-3 border-b border-zinc-50 bg-zinc-50/50 flex items-center justify-between">
                <h2 className="text-[8px] md:text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Danh Mục</h2>
                <button 
                  onClick={addKanbanRow}
                  className="text-[8px] md:text-[9px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors font-bold"
                >
                  + Thêm
                </button>
              </div>
              <div className="flex-1 overflow-auto p-1 md:p-3">
                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                  <table className="w-full text-[8px] md:text-[10px] border-collapse table-fixed">
                    <thead>
                      <tr className="text-zinc-600">
                        <th className="p-1 bg-red-50 text-red-700 border-b border-r border-red-100 font-bold text-center">To do</th>
                        <th className="p-1 bg-orange-50 text-orange-700 border-b border-r border-orange-100 font-bold text-center">In progress</th>
                        <th className="p-1 bg-green-50 text-green-700 border-b border-r border-green-100 font-bold text-center">Done</th>
                        <th className="w-4 md:w-6 bg-zinc-50 border-b border-zinc-100"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {kanbanData.map((row) => (
                        <tr key={row.id} className="group hover:brightness-95 transition-all">
                          <td className="p-0.5 border-b border-r border-red-100 bg-red-50 text-red-700">
                            <textarea 
                              className="w-full bg-transparent outline-none resize-none p-1 min-h-[18px] leading-tight font-medium placeholder-red-300"
                              value={row.todo}
                              onChange={(e) => updateKanbanRow(row.id, 'todo', e.target.value)}
                              rows={1}
                            />
                          </td>
                          <td className="p-0.5 border-b border-r border-orange-100 bg-orange-50 text-orange-700">
                            <textarea 
                              className="w-full bg-transparent outline-none resize-none p-1 min-h-[18px] leading-tight font-medium placeholder-orange-300"
                              value={row.progress}
                              onChange={(e) => updateKanbanRow(row.id, 'progress', e.target.value)}
                              rows={1}
                            />
                          </td>
                          <td className="p-0.5 border-b border-r border-green-100 bg-green-50 text-green-700">
                            <textarea 
                              className="w-full bg-transparent outline-none resize-none p-1 min-h-[18px] leading-tight font-medium placeholder-green-300"
                              value={row.done}
                              onChange={(e) => updateKanbanRow(row.id, 'done', e.target.value)}
                              rows={1}
                            />
                          </td>
                          <td className="p-0.5 border-b border-zinc-100 text-center align-middle bg-zinc-50">
                            <button 
                              onClick={() => deleteKanbanRow(row.id)}
                              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>

      {/* 360 Viewer Modal */}
      <AnimatePresence>
        {activeHotspot && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-8 bg-black/90 backdrop-blur-md"
          >
            <div className="relative w-full h-full bg-zinc-900 rounded-xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
              {/* Modal Header */}
              <div className="p-3 md:p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 md:p-2 bg-emerald-500/20 rounded-lg">
                    <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xs md:text-sm font-bold text-white">{activeHotspot.name}</h2>
                    <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-widest font-bold">360° Panorama View</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveHotspot(null)}
                  className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6 text-zinc-400" />
                </button>
              </div>

              {/* Viewer Content */}
              <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
                {/* Panorama Container */}
                <div 
                  id="panorama-viewer" 
                  className="flex-1 bg-black min-h-[40vh]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropTo360}
                />

                {/* Internal Hotspot List (Draggable) */}
                <div className="w-full md:w-64 bg-zinc-900/80 backdrop-blur-xl border-t md:border-t-0 md:border-l border-white/5 p-3 md:p-4 overflow-y-auto h-[30vh] md:h-full">
                  <h3 className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 md:mb-4">Kéo thả để tạo liên kết</h3>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                    {hotspots.map(h => (
                      <div
                        key={h.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('hotspotId', h.id)}
                        onClick={() => setActiveHotspot(h)}
                        className={`flex items-center gap-2 p-2 md:p-3 rounded-lg md:rounded-xl border transition-all text-left cursor-grab active:cursor-grabbing ${activeHotspot.id === h.id ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-500'}`}
                      >
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="text-[10px] md:text-xs font-bold truncate">{h.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
