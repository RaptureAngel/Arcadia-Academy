import { useMemo, useState } from "react";
import {
  createClientId,
  getClientOptions,
  normalizeClientAccentColor,
} from "../utils/clients";

function createBlankClientDraft() {
  return {
    name: "",
    notes: "",
    accentColor: "",
  };
}

export function useClientLibrary({
  clientLibrary,
  setClientLibrary,
  openConfirmDialog,
  onClientSaved,
  onClientDeleted,
} = {}) {
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientDraft, setClientDraft] = useState(() => createBlankClientDraft());

  const clientNames = useMemo(
    () => clientLibrary.map((item) => item.name).filter(Boolean),
    [clientLibrary]
  );

  const clientDisplayByName = useMemo(() => {
    return new Map(
      clientLibrary.map((clientRecord) => [
        clientRecord.name.toLowerCase(),
        clientRecord,
      ])
    );
  }, [clientLibrary]);

  function getClientOptionsFor(selectedClient) {
    return getClientOptions(clientNames, selectedClient);
  }

  function openNewClientForm() {
    setClientDraft(createBlankClientDraft());
    setEditingClientId(null);
    setShowClientForm(true);
  }

  function openEditClientForm(clientId) {
    const clientToEdit = clientLibrary.find((item) => item.id === clientId);

    if (!clientToEdit) return;

    setClientDraft({
      name: clientToEdit.name || "",
      notes: clientToEdit.notes || "",
      accentColor: clientToEdit.accentColor || "",
    });
    setEditingClientId(clientToEdit.id);
    setShowClientForm(true);
  }

  function cancelClientForm() {
    setClientDraft(createBlankClientDraft());
    setEditingClientId(null);
    setShowClientForm(false);
  }

  function closeClientManagerUi() {
    setEditingClientId(null);
    setShowClientForm(false);
  }

  function updateClientDraft(field, value) {
    setClientDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function saveClient(event) {
    event.preventDefault();

    const name = clientDraft.name.trim();
    const notes = clientDraft.notes.trim();
    const accentColor = normalizeClientAccentColor(clientDraft.accentColor);

    if (!name) {
      window.alert("Client name is required.");
      return;
    }

    const matchingClient = clientLibrary.find(
      (item) =>
        item.name.toLowerCase() === name.toLowerCase() &&
        item.id !== editingClientId
    );

    if (matchingClient) {
      window.alert("A client with that name already exists.");
      return;
    }

    const existingClient = editingClientId
      ? clientLibrary.find((item) => item.id === editingClientId)
      : null;
    const savedAt = new Date().toISOString();
    const clientToSave = {
      id: existingClient?.id || createClientId(name),
      name,
      notes,
      accentColor,
      isActive: existingClient?.isActive !== false,
      createdAt: existingClient?.createdAt || savedAt,
      updatedAt: savedAt,
    };

    setClientLibrary((currentClients) =>
      existingClient
        ? currentClients.map((item) =>
            item.id === existingClient.id ? clientToSave : item
          )
        : [clientToSave, ...currentClients]
    );
    onClientSaved?.(clientToSave.name);
    setClientDraft(createBlankClientDraft());
    setEditingClientId(null);
    setShowClientForm(false);
  }

  function deleteClient(clientId) {
    const clientToDelete = clientLibrary.find((item) => item.id === clientId);

    if (!clientToDelete) return;

    openConfirmDialog({
      title: "Delete Client",
      message: `Delete client "${clientToDelete.name}"? Existing tasks, projects, templates, and work logs will not be changed.`,
      confirmLabel: "Delete",
      isDangerous: true,
      onConfirm: () => {
        const nextClients = clientLibrary.filter((item) => item.id !== clientId);
        const nextDefaultClient = nextClients[0]?.name || "";

        setClientLibrary(nextClients);
        onClientDeleted?.({
          clientName: clientToDelete.name,
          nextDefaultClient,
        });

        if (editingClientId === clientId) {
          cancelClientForm();
        }
      },
    });
  }

  return {
    clientNames,
    clientDisplayByName,
    getClientOptionsFor,
    showClientForm,
    editingClientId,
    clientDraft,
    openNewClientForm,
    openEditClientForm,
    cancelClientForm,
    closeClientManagerUi,
    updateClientDraft,
    saveClient,
    deleteClient,
  };
}
