-- Script para eliminar las dos tiendas específicas solicitadas

DELETE FROM public.stores
WHERE name IN (
    'Nike Maipú - Av. Americo Vespucio 399, Shops 408-410, Santiago',
    'Nike Ripley Costanera - Andrés Bello 2447, Interior Tienda Ripley 5to nivel Shop 1300, Santiago'
);

-- Opcional: verificar que se hayan eliminado correctamente
-- SELECT id, name FROM public.stores WHERE name LIKE 'Nike %';
