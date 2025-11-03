import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, Eye, Plus, Edit, Trash2, Mail, CalendarDays, Users, FileText, Truck, CreditCard } from 'lucide-react';
import type { Reservation, ReservationFood, ReservationPerson, PricingDefault } from '@shared/types';
import { PERSON_TYPE_LABELS } from '@shared/types';
import dayjs from 'dayjs';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';

// Schema for person in reservation
const personSchema = z.object({
  type: z.enum(['adult', 'child', 'infant']),
  menu: z.string(),
  price: z.coerce.number().min(0),
});

// Main reservation schema
const reservationSchema = z.object({
  date: z.string().min(1, 'Datum je povinné'),
  contactName: z.string().min(1, 'Jméno je povinné'),
  contactEmail: z.string().email('Neplatný email'),
  contactPhone: z.string().min(1, 'Telefon je povinný'),
  contactNationality: z.string().min(1, 'Národnost je povinná'),
  clientComeFrom: z.string().optional(),
  contactNote: z.string().optional(),
  invoiceSameAsContact: z.boolean().default(true),
  invoiceName: z.string().optional(),
  invoiceCompany: z.string().optional(),
  invoiceIc: z.string().optional(),
  invoiceDic: z.string().optional(),
  invoiceEmail: z.string().optional(),
  invoicePhone: z.string().optional(),
  transferSelected: z.boolean().default(false),
  transferCount: z.coerce.number().optional(),
  transferAddress: z.string().optional(),
  agreement: z.boolean().refine((val) => val === true, {
    message: 'Musíte souhlasit s VOP',
  }),
  persons: z.array(personSchema).min(1, 'Musíte přidat alespoň jednu osobu'),
  status: z.enum(['RECEIVED', 'WAITING_PAYMENT', 'PAID', 'CANCELLED', 'AUTHORIZED', 'CONFIRMED']).default('RECEIVED'),
});

type ReservationForm = z.infer<typeof reservationSchema>;

export default function Reservations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  // Fetch data
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['/api/reservations'],
    queryFn: () => api.get<Reservation[]>('/api/reservations'),
  });

  const { data: foods } = useQuery({
    queryKey: ['/api/reservation-foods'],
    queryFn: () => api.get<ReservationFood[]>('/api/reservation-foods'),
  });

  const { data: pricing } = useQuery<PricingDefault>({
    queryKey: ['/api/pricing/defaults'],
  });

  // Form
  const form = useForm<ReservationForm>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      date: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactNationality: 'Česká republika',
      clientComeFrom: '',
      contactNote: '',
      invoiceSameAsContact: true,
      invoiceName: '',
      invoiceCompany: '',
      invoiceIc: '',
      invoiceDic: '',
      invoiceEmail: '',
      invoicePhone: '',
      transferSelected: false,
      transferCount: 0,
      transferAddress: '',
      agreement: false,
      persons: [],
      status: 'RECEIVED',
    },
  });

  const { fields: personFields, append: appendPerson, remove: removePerson, update: updatePerson } = useFieldArray({
    control: form.control,
    name: 'persons',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ReservationForm) => api.post('/api/reservations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: 'Rezervace byla úspěšně vytvořena' });
    },
    onError: () => {
      toast({ title: 'Chyba při vytváření rezervace', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReservationForm }) =>
      api.put(`/api/reservations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      setIsDialogOpen(false);
      setEditingReservation(null);
      form.reset();
      toast({ title: 'Rezervace byla úspěšně aktualizována' });
    },
    onError: () => {
      toast({ title: 'Chyba při aktualizaci rezervace', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/reservations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      toast({ title: 'Rezervace byla úspěšně smazána' });
    },
    onError: () => {
      toast({ title: 'Chyba při mazání rezervace', variant: 'destructive' });
    },
  });

  const sendPaymentEmailMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/reservations/${id}/send-payment-email`),
    onSuccess: () => {
      toast({ title: 'Platební email byl odeslán' });
    },
    onError: () => {
      toast({ title: 'Chyba při odesílání platebního emailu', variant: 'destructive' });
    },
  });

  // Handlers
  const handleCreate = () => {
    setEditingReservation(null);
    form.reset({
      date: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactNationality: 'Česká republika',
      clientComeFrom: '',
      contactNote: '',
      invoiceSameAsContact: true,
      invoiceName: '',
      invoiceCompany: '',
      invoiceIc: '',
      invoiceDic: '',
      invoiceEmail: '',
      invoicePhone: '',
      transferSelected: false,
      transferCount: 0,
      transferAddress: '',
      agreement: false,
      persons: [],
      status: 'RECEIVED',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    form.reset({
      date: reservation.date,
      contactName: reservation.contactName,
      contactEmail: reservation.contactEmail,
      contactPhone: reservation.contactPhone,
      contactNationality: reservation.contactNationality,
      clientComeFrom: reservation.clientComeFrom || '',
      contactNote: reservation.contactNote || '',
      invoiceSameAsContact: reservation.invoiceSameAsContact,
      invoiceName: reservation.invoiceName || '',
      invoiceCompany: reservation.invoiceCompany || '',
      invoiceIc: reservation.invoiceIc || '',
      invoiceDic: reservation.invoiceDic || '',
      invoiceEmail: reservation.invoiceEmail || '',
      invoicePhone: reservation.invoicePhone || '',
      transferSelected: reservation.transferSelected,
      transferCount: reservation.transferCount || 0,
      transferAddress: reservation.transferAddress || '',
      agreement: reservation.agreement,
      persons: reservation.persons?.map(p => ({
        type: p.type,
        menu: p.menu,
        price: p.price,
      })) || [],
      status: reservation.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Opravdu chcete smazat tuto rezervaci?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewDetail = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsDetailOpen(true);
  };

  const handleSendPaymentEmail = (id: number) => {
    if (confirm('Opravdu chcete odeslat platební email?')) {
      sendPaymentEmailMutation.mutate(id);
    }
  };

  const onSubmit = (data: ReservationForm) => {
    if (editingReservation) {
      updateMutation.mutate({ id: editingReservation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Helper: Add person
  const addPerson = (type: 'adult' | 'child' | 'infant') => {
    const defaultPrice = type === 'adult' 
      ? pricing?.adultPrice || 1250 
      : type === 'child' 
        ? pricing?.childPrice || 800 
        : pricing?.infantPrice || 0;

    appendPerson({
      type,
      menu: type === 'infant' ? 'Bez jídla' : '',
      price: defaultPrice,
    });
  };

  // Watch form values for total calculation
  const watchedPersons = form.watch('persons');
  const watchedTransferSelected = form.watch('transferSelected');
  const watchedTransferCount = form.watch('transferCount');

  // Calculate total (memoized)
  const totalPrice = useMemo(() => {
    const personsTotal = (watchedPersons || []).reduce((sum, person) => sum + (person.price || 0), 0);
    const transferTotal = watchedTransferSelected 
      ? (watchedTransferCount || 0) * 300 
      : 0;
    return personsTotal + transferTotal;
  }, [watchedPersons, watchedTransferSelected, watchedTransferCount]);

  // Filter reservations
  const filteredReservations = reservations?.filter((reservation) => {
    const search = searchTerm.toLowerCase();
    return (
      reservation.contactName.toLowerCase().includes(search) ||
      reservation.contactEmail.toLowerCase().includes(search) ||
      reservation.contactPhone.includes(search) ||
      reservation.id.toString().includes(search)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání rezervací...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Rezervace
          </h1>
          <p className="text-muted-foreground mt-1">Správa všech rezervací</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-primary to-purple-600"
          data-testid="button-create-reservation"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nová rezervace
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Hledat rezervace..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-reservations"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Osoby</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Žádné rezervace
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id} data-testid={`row-reservation-${reservation.id}`}>
                      <TableCell className="font-mono text-sm">#{reservation.id}</TableCell>
                      <TableCell>{dayjs(reservation.date).format('DD.MM.YYYY')}</TableCell>
                      <TableCell className="font-medium">{reservation.contactName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{reservation.contactEmail}</TableCell>
                      <TableCell className="font-mono text-sm">{reservation.contactPhone}</TableCell>
                      <TableCell>{reservation.persons?.length || 0}</TableCell>
                      <TableCell>
                        <StatusBadge status={reservation.status} type="reservation" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(reservation)}
                            data-testid={`button-view-${reservation.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(reservation)}
                            data-testid={`button-edit-${reservation.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendPaymentEmail(reservation.id)}
                            data-testid={`button-send-payment-${reservation.id}`}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(reservation.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${reservation.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReservation ? 'Upravit rezervaci' : 'Nová rezervace'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic" data-testid="tab-basic">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    Základní
                  </TabsTrigger>
                  <TabsTrigger value="persons" data-testid="tab-persons">
                    <Users className="w-4 h-4 mr-2" />
                    Osoby
                  </TabsTrigger>
                  <TabsTrigger value="contact" data-testid="tab-contact">
                    <FileText className="w-4 h-4 mr-2" />
                    Kontakt
                  </TabsTrigger>
                  <TabsTrigger value="invoice" data-testid="tab-invoice">
                    <FileText className="w-4 h-4 mr-2" />
                    Fakturace
                  </TabsTrigger>
                  <TabsTrigger value="transfer" data-testid="tab-transfer">
                    <Truck className="w-4 h-4 mr-2" />
                    Transfer
                  </TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum představení</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="RECEIVED">Přijato</SelectItem>
                            <SelectItem value="WAITING_PAYMENT">Čeká na platbu</SelectItem>
                            <SelectItem value="PAID">Zaplaceno</SelectItem>
                            <SelectItem value="AUTHORIZED">Autorizováno</SelectItem>
                            <SelectItem value="CONFIRMED">Potvrzeno</SelectItem>
                            <SelectItem value="CANCELLED">Zrušeno</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Persons Tab */}
                <TabsContent value="persons" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Osoby a jídla</h3>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addPerson('adult')}
                        data-testid="button-add-adult"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Dospělý
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addPerson('child')}
                        data-testid="button-add-child"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Dítě
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addPerson('infant')}
                        data-testid="button-add-infant"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Batole
                      </Button>
                    </div>
                  </div>

                  {personFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-md">
                      Přidejte osoby pomocí tlačítek výše
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {personFields.map((person, index) => (
                        <div key={person.id} className="border rounded-md p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              Osoba {index + 1} - {PERSON_TYPE_LABELS[person.type]}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePerson(index)}
                              className="text-destructive"
                              data-testid={`button-remove-person-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`persons.${index}.menu`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Menu</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value}
                                    disabled={person.type === 'infant'}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid={`select-menu-${index}`}>
                                        <SelectValue placeholder="Vyberte menu" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {person.type === 'infant' ? (
                                        <SelectItem value="Bez jídla">Bez jídla</SelectItem>
                                      ) : (
                                        <>
                                          {foods
                                            ?.filter(f => person.type === 'child' ? f.isChildrenMenu : !f.isChildrenMenu)
                                            .map(food => (
                                              <SelectItem key={food.id} value={food.name}>
                                                {food.name}
                                              </SelectItem>
                                            ))
                                          }
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`persons.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cena</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={field.value || ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          field.onChange(value === '' ? 0 : parseFloat(value));
                                        }}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                        ref={field.ref}
                                        data-testid={`input-price-${index}`}
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        Kč
                                      </span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>Celková cena osob:</span>
                      <span className="font-mono">{Math.round(totalPrice).toLocaleString('cs-CZ')} Kč</span>
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jméno</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contact-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-contact-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactNationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Národnost</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contact-nationality" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="clientComeFrom"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Odkud jste se o nás dozvěděli? (volitelné)</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-client-come-from" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactNote"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Poznámka (volitelná)</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-contact-note" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Invoice Tab */}
                <TabsContent value="invoice" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="invoiceSameAsContact"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-invoice-same"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Fakturační údaje stejné jako kontaktní</FormLabel>
                      </FormItem>
                    )}
                  />

                  {!form.watch('invoiceSameAsContact') && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="invoiceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fakturační jméno</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-invoice-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="invoiceCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Firma</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-invoice-company" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="invoiceIc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IČ</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-invoice-ic" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="invoiceDic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>DIČ</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-invoice-dic" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="invoiceEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-invoice-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="invoicePhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-invoice-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </TabsContent>

                {/* Transfer Tab */}
                <TabsContent value="transfer" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="transferSelected"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-transfer"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Požaduji transfer (300 Kč/osoba)</FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch('transferSelected') && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transferCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Počet osob na transfer</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? 0 : parseInt(value, 10));
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                data-testid="input-transfer-count"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-end">
                        <div className="text-sm text-muted-foreground">
                          Cena transferu: {((form.watch('transferCount') || 0) * 300).toLocaleString('cs-CZ')} Kč
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="transferAddress"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Adresa vyzvednutí</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-transfer-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Agreement & Submit */}
              <div className="space-y-4 border-t pt-4">
                <FormField
                  control={form.control}
                  name="agreement"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-agreement"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        Souhlasím se zpracováním osobních údajů a VOP
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                  <span className="text-lg font-semibold">Celková cena:</span>
                  <span className="text-2xl font-bold font-mono bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {Math.round(totalPrice).toLocaleString('cs-CZ')} Kč
                  </span>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-reservation"
                  >
                    Zrušit
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-gradient-to-r from-primary to-purple-600"
                    data-testid="button-save-reservation"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Ukládání...'
                      : editingReservation
                      ? 'Uložit změny'
                      : 'Vytvořit rezervaci'}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal (Read-only) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Detail rezervace #{selectedReservation?.id}</DialogTitle>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold mb-3">Základní informace</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Datum</p>
                    <p className="font-medium">{dayjs(selectedReservation.date).format('DD.MM.YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <StatusBadge status={selectedReservation.status} type="reservation" />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold mb-3">Kontaktní údaje</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Jméno</p>
                    <p className="font-medium">{selectedReservation.contactName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedReservation.contactEmail}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Telefon</p>
                    <p className="font-mono">{selectedReservation.contactPhone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Národnost</p>
                    <p className="font-medium">{selectedReservation.contactNationality}</p>
                  </div>
                  {selectedReservation.clientComeFrom && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Zdroj</p>
                      <p className="font-medium">{selectedReservation.clientComeFrom}</p>
                    </div>
                  )}
                  {selectedReservation.contactNote && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Poznámka</p>
                      <p className="font-medium">{selectedReservation.contactNote}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Persons */}
              {selectedReservation.persons && selectedReservation.persons.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Osoby ({selectedReservation.persons.length})</h3>
                  <div className="space-y-2">
                    {selectedReservation.persons.map((person, index) => (
                      <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{PERSON_TYPE_LABELS[person.type]}</p>
                            <p className="text-sm text-muted-foreground">Menu: {person.menu || 'Bez jídla'}</p>
                          </div>
                        </div>
                        <p className="font-mono font-medium">{Math.round(person.price).toLocaleString('cs-CZ')} Kč</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoice */}
              {!selectedReservation.invoiceSameAsContact && selectedReservation.invoiceName && (
                <div>
                  <h3 className="font-semibold mb-3">Fakturační údaje</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Jméno</p>
                      <p className="font-medium">{selectedReservation.invoiceName}</p>
                    </div>
                    {selectedReservation.invoiceCompany && (
                      <div>
                        <p className="text-muted-foreground">Firma</p>
                        <p className="font-medium">{selectedReservation.invoiceCompany}</p>
                      </div>
                    )}
                    {selectedReservation.invoiceIc && (
                      <div>
                        <p className="text-muted-foreground">IČ</p>
                        <p className="font-mono">{selectedReservation.invoiceIc}</p>
                      </div>
                    )}
                    {selectedReservation.invoiceDic && (
                      <div>
                        <p className="text-muted-foreground">DIČ</p>
                        <p className="font-mono">{selectedReservation.invoiceDic}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transfer */}
              {selectedReservation.transferSelected && (
                <div>
                  <h3 className="font-semibold mb-3">Transfer</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Počet osob</p>
                      <p className="font-medium">{selectedReservation.transferCount}</p>
                    </div>
                    {selectedReservation.transferAddress && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Adresa</p>
                        <p className="font-medium">{selectedReservation.transferAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payments */}
              {selectedReservation.payments && selectedReservation.payments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Platby ({selectedReservation.payments.length})</h3>
                  <div className="space-y-2">
                    {selectedReservation.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium font-mono text-sm">ID: {payment.transactionId}</p>
                          <p className="text-xs text-muted-foreground">
                            {dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-mono font-medium">{payment.amount} Kč</p>
                          <StatusBadge status={payment.status} type="payment" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
