
import React, { useEffect, useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputNumber } from "primereact/inputnumber";
import { ProgressBar } from "primereact/progressbar";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

type Artwork = {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
};

const ArtworkTable: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rows] = useState(10);

  const [selectedRowsMap, setSelectedRowsMap] = useState<Map<number, Set<number>>>(new Map());
  const [currentPageSelection, setCurrentPageSelection] = useState<number[]>([]);
  const [rowsToSelect, setRowsToSelect] = useState<number>(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionProgress, setSelectionProgress] = useState(0);

  const overlayRef = useRef<OverlayPanel>(null);
  const currentPage = first / rows + 1;

  const fetchArtworks = async (page: number, limit: number = rows) => {
    try {
      const res = await fetch(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${limit}`);
      const json = await res.json();
      return json;
    } catch (err) {
      console.error("Failed to fetch artworks", err);
      return null;
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      const json = await fetchArtworks(currentPage);
      if (json) {
        setArtworks(json.data);
        setTotalRecords(json.pagination.total);
      }
    };
    loadPage();

    const pageSelected = selectedRowsMap.get(currentPage);
    setCurrentPageSelection(pageSelected ? Array.from(pageSelected) : []);
  }, [first]);

  const onPageChange = (e: { first: number }) => {
    setFirst(e.first ?? 0);
  };

  const onSelectionChange = (e: { value: Artwork[] }) => {
    const selectedIds: number[] = e.value.map((row: Artwork) => row.id);
     console.log("🟢 Current page selected IDs:", selectedIds);
    setCurrentPageSelection(selectedIds);

    const updatedMap = new Map(selectedRowsMap);
    updatedMap.set(currentPage, new Set(selectedIds));
    setSelectedRowsMap(updatedMap);
  };

  const getAllSelectedIds = () => {
    const allSelectedIds: Set<number> = new Set();
    for (const set of selectedRowsMap.values()) {
      set.forEach((id) => allSelectedIds.add(id));
    }
    return Array.from(allSelectedIds);
  };

  const selectionFromIds = artworks.filter((art) =>
    currentPageSelection.includes(art.id)
  );

  const handleSelectRows = async () => {
  if (rowsToSelect <= 0) return;

  setIsSelecting(true);
  setSelectionProgress(0);

  const updatedMap = new Map<number, Set<number>>();
  const selectedIds = new Set<number>();

  const totalPages = Math.ceil(rowsToSelect / rows);

  let remaining = rowsToSelect;

  for (let page = 1; page <= totalPages; page++) {
    const limit = Math.min(rows, remaining); // ✅ Fix for small row selection
    const json = await fetchArtworks(page, limit);

    if (json && json.data) {
      const ids = json.data.map((art: Artwork) => art.id);
      ids.forEach((id) => selectedIds.add(id));
      updatedMap.set(page, new Set(ids));
    }

    setSelectionProgress(Math.round((page / totalPages) * 100));
    remaining -= limit;
  }

  setSelectedRowsMap(updatedMap);

  if (updatedMap.has(currentPage)) {
    setCurrentPageSelection(Array.from(updatedMap.get(currentPage)!));
  } else {
    setCurrentPageSelection([]);
  }

  setIsSelecting(false);
  overlayRef.current?.hide();
};


  return (
    <div>

      <OverlayPanel ref={overlayRef}>
        <div >
          <InputNumber
            value={rowsToSelect}
            onValueChange={(e) => setRowsToSelect(e.value || 0)}
            placeholder="Select rows..."
            
          />
          <Button label="Submit" className="custom-button" onClick={handleSelectRows} />
          <style>{`
  .custom-button {
    width: 50%;
    background-color: black;
    color: white;
    padding: 0.5rem 1rem;
    
  }
`}</style>
          {isSelecting && (
            <div className="mt-2">
              <ProgressBar value={selectionProgress} />
            </div>
          )}
        </div>
      </OverlayPanel>

      <DataTable
        value={artworks}
        selection={selectionFromIds}
        onSelectionChange={onSelectionChange}
        dataKey="id"
        selectionMode="checkbox"
        paginator={false}
        loading={isSelecting}
      >
        <Column selectionMode="multiple" headerStyle={{ width: "3rem" }}></Column>
        <Column
          field="title"
          header={
            <div className="flex items-center">
              <i
                className="pi pi-chevron-down cursor-pointer"
                onClick={(e) => overlayRef.current?.toggle(e)}
              ></i>
              <span className="ml-2">Title</span>
            </div>
          }
        />
        <Column field="place_of_origin" header="Origin" />
        <Column field="artist_display" header="Artist" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Start" />
        <Column field="date_end" header="End" />
      </DataTable>

      <Paginator
        first={first}
        rows={rows}
        totalRecords={totalRecords}
        onPageChange={onPageChange}
        
        // disabled={isSelecting}
      />

      <div>
        <h3 >Selected Artworks:</h3>
        <div  style={{ backgroundColor: '#f8f9fa' }}>
          <div >Total selected: {getAllSelectedIds().length} rows</div>
          <ul >
            {getAllSelectedIds().map((id) => (
              <li key={id}>Artwork ID: {id}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ArtworkTable;

