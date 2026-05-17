-- Seed Data for Parts Catalog

INSERT INTO public.parts (id, name, category, manufacturer, price, specs)
VALUES
-- Frames
('f0000000-0000-0000-0000-000000000001', 'Light Bee X Frame', 'frame', 'Sur-Ron', 500.00, '{"mount_type": "sur-ron", "wheel_size_max": 19, "clearance": "standard"}'),
('f0000000-0000-0000-0000-000000000002', 'Sting R Frame', 'frame', 'Talaria', 550.00, '{"mount_type": "talaria", "wheel_size_max": 19, "clearance": "wide"}'),

-- Motors
('m0000000-0000-0000-0000-000000000001', 'KO Moto Factory Spec', 'motor', 'KO Moto', 899.00, '{"mount_type": "sur-ron", "kv": 500, "max_kw": 35}'),
('m0000000-0000-0000-0000-000000000002', 'Sotion FW01', 'motor', 'Sotion', 750.00, '{"mount_type": "talaria", "kv": 480, "max_kw": 30}'),

-- Batteries
('b0000000-0000-0000-0000-000000000001', 'Gladiator 72v 42Ah', 'battery', 'ChiBattery', 2200.00, '{"voltage": 72, "capacity_ah": 42, "connector": "qs8", "dimensions": "sur-ron-std"}'),
('b0000000-0000-0000-0000-000000000002', 'Gladiator 60v 60Ah Max', 'battery', 'ChiBattery', 2300.00, '{"voltage": 60, "capacity_ah": 60, "connector": "supco", "dimensions": "sur-ron-std"}'),

-- Controllers
('c0000000-0000-0000-0000-000000000001', 'EBMX X-9000', 'controller', 'EBMX', 1050.00, '{"max_voltage": 84, "min_voltage": 48, "max_phase_amps": 900, "connectors": ["qs8", "supco"]}'),
('c0000000-0000-0000-0000-000000000002', 'BAC4000', 'controller', 'ASI', 800.00, '{"max_voltage": 72, "min_voltage": 48, "max_phase_amps": 400, "connectors": ["supco"]}');
