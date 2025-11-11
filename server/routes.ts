import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Events endpoints
  app.get("/api/events", async (_req: Request, res: Response) => {
    try {
      const events = await storage.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req: Request, res: Response) => {
    try {
      const event = await storage.createEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.updateEvent(id, req.body);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEvent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // StaffMembers endpoints
  app.get("/api/staff-members", async (_req: Request, res: Response) => {
    try {
      const staffMembers = await storage.getStaffMembers();
      res.json(staffMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff members" });
    }
  });

  app.get("/api/staff-members/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const staffMember = await storage.getStaffMember(id);
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff member" });
    }
  });

  app.post("/api/staff-members", async (req: Request, res: Response) => {
    try {
      const staffMember = await storage.createStaffMember(req.body);
      res.status(201).json(staffMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  // EventTables endpoints
  app.get("/api/events/:eventId/tables", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const tables = await storage.getEventTables(eventId);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event tables" });
    }
  });

  app.post("/api/events/:eventId/tables", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const table = await storage.createEventTable({ ...req.body, eventId });
      res.status(201).json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event table" });
    }
  });

  app.put("/api/events/:eventId/tables/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const table = await storage.updateEventTable(id, req.body);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event table" });
    }
  });

  app.delete("/api/events/:eventId/tables/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEventTable(id);
      if (!deleted) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event table" });
    }
  });

  // EventGuests endpoints
  app.get("/api/events/:eventId/guests", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const guests = await storage.getEventGuests(eventId);
      res.json(guests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event guests" });
    }
  });

  app.post("/api/events/:eventId/guests", async (req: Request, res: Response) => {
    try {
      const guest = await storage.createEventGuest(req.body);
      res.status(201).json(guest);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event guest" });
    }
  });

  app.put("/api/events/:eventId/guests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const guest = await storage.updateEventGuest(id, req.body);
      if (!guest) {
        return res.status(404).json({ message: "Guest not found" });
      }
      res.json(guest);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event guest" });
    }
  });

  app.delete("/api/events/:eventId/guests/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEventGuest(id);
      if (!deleted) {
        return res.status(404).json({ message: "Guest not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event guest" });
    }
  });

  // EventMenuItems endpoints
  app.get("/api/events/:eventId/menu-items", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const menuItems = await storage.getEventMenuItems(eventId);
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event menu items" });
    }
  });

  app.post("/api/events/:eventId/menu-items", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const menuItem = await storage.createEventMenuItem({ ...req.body, eventId });
      res.status(201).json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event menu item" });
    }
  });

  app.put("/api/events/:eventId/menu-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const menuItem = await storage.updateEventMenuItem(id, req.body);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event menu item" });
    }
  });

  app.delete("/api/events/:eventId/menu-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEventMenuItem(id);
      if (!deleted) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event menu item" });
    }
  });

  // EventStaffAssignments endpoints
  app.get("/api/events/:eventId/staff-assignments", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const assignments = await storage.getEventStaffAssignments(eventId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch event staff assignments" });
    }
  });

  app.post("/api/events/:eventId/staff-assignments", async (req: Request, res: Response) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const assignment = await storage.createEventStaffAssignment({ ...req.body, eventId });
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event staff assignment" });
    }
  });

  app.delete("/api/events/:eventId/staff-assignments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEventStaffAssignment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Staff assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event staff assignment" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
