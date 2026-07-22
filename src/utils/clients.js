import { clients } from "../data/clients";

const CLIENT_LIBRARY_VERSION = 1;

export function createClientId(name) {
  return `client-${String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || crypto.randomUUID()}`;
}

export function normalizeClientAccentColor(value) {
  const color = String(value || "").trim();

  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "";
}

export function normalizeClientRecord(client) {
  const now = new Date().toISOString();
  const name = typeof client === "string" ? client : client?.name;

  return {
    id: typeof client === "object" && client?.id ? client.id : createClientId(name),
    name: String(name || "Untitled Client").trim(),
    notes: typeof client === "object" ? client.notes || "" : "",
    accentColor:
      typeof client === "object"
        ? normalizeClientAccentColor(client.accentColor || client.color)
        : "",
    isActive: typeof client === "object" ? client.isActive !== false : true,
    createdAt:
      typeof client === "object" && client.createdAt ? client.createdAt : now,
    updatedAt:
      typeof client === "object" && client.updatedAt
        ? client.updatedAt
        : typeof client === "object" && client.createdAt
        ? client.createdAt
        : now,
  };
}

export function createSeededClientLibrary() {
  return clients.map((clientName) => normalizeClientRecord(clientName));
}

export function createClientLibraryRecord(clientLibrary) {
  return {
    version: CLIENT_LIBRARY_VERSION,
    clients: clientLibrary,
  };
}

export function getClientOptions(clientNames, selectedClient) {
  if (!selectedClient || clientNames.includes(selectedClient)) {
    return clientNames;
  }

  return [selectedClient, ...clientNames];
}
