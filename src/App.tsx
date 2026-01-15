
import React, {useState} from "react";
import { Formik, Form } from "formik";
import { TextField, Button, Container, Stack, Typography, InputAdornment, MenuItem, Box, Card, CardContent, ThemeProvider, createTheme, Divider, Chip } from "@mui/material";
import { Calculate, Person, Straighten, Build, Assessment } from '@mui/icons-material';
import * as yup from "yup";
import * as ort from "onnxruntime-web";

// Custom medical theme with vibrant colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb', // Modern blue
      light: '#60a5fa',
      dark: '#1e40af',
    },
    secondary: {
      main: '#8b5cf6', // Purple accent
      light: '#a78bfa',
      dark: '#6d28d9',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h2: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h6: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: '1rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          padding: '12px 32px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#ffffff',
          },
        },
      },
    },
  },
});

/** 1) Literal unions for all field keys and categories */
type InputKey =
    | "age_at_insertion"
    | "height_pre"
    | "weight_pre"
    | "eos_type"
    | "amb_status_preop"
    | "major_cobb_angle_pre"
    | "minor_cobb_angle_pre"
    | "kyphosis_pre"
    | "construct_type_initial"
    | "construct_side_initial"
    | "superior_attach_initial"
    | "num_superior_anchors_initial"
    | "inferior_attach_initial";

type CategoryKey = "Patient factors" | "Radiographic factors" | "Planned construct";

/** 2) Field metadata types */
type ContinuousField = {
    type: "continuous";
    label: string;
    name: InputKey;
    units: string;
};
type CategoricalField = {
    type: "categorical";
    label: string;
    name: InputKey;
    options: readonly string[];
};
type Field = ContinuousField | CategoricalField;

const inputInfo: Record<InputKey, Field> = {
    'age_at_insertion': {
        'type': 'continuous',
        'label': 'Age at insertion',
        'name': 'age_at_insertion',
        'units': 'years',
    },
    'height_pre': {
        'type': 'continuous',
        'label': 'Height at insertion',
        'name': 'height_pre',
        'units': 'cm',
    },
    'weight_pre': {
        'type': 'continuous',
        'label': 'Weight at insertion',
        'name': 'weight_pre',
        'units': 'kg',
    },
    'eos_type': {
        'type': 'categorical',
        'label': 'EOS etiology',
        'name': 'eos_type',
        'options': ['Congenital', 'Idiopathic', 'Neuromuscular', 'Syndromic'] as const,
    },
    'amb_status_preop': {
        'type': 'categorical',
        'label': 'Ambulatory status',
        'name': 'amb_status_preop',
        'options': ['Ambulatory', 'Non-ambulatory'] as const,
    },

    'major_cobb_angle_pre': {
        'type': 'continuous',
        'label': 'Major Cobb angle',
        'name': 'major_cobb_angle_pre',
        'units': 'degrees',
    },
    'minor_cobb_angle_pre': {
        'type': 'continuous',
        'label': 'Minor Cobb angle',
        'name': 'minor_cobb_angle_pre',
        'units': 'degrees',
    },
    'kyphosis_pre': {
        'type': 'continuous',
        'label': 'Kyphosis',
        'name': 'kyphosis_pre',
        'units': 'degrees',
    },

    'construct_type_initial': {
        'type': 'categorical',
        'label': 'Initial construct type',
        'name': 'construct_type_initial',
        'options': ['MCGR', 'TGR', 'VEPTR'] as const,
    },
    'construct_side_initial': {
        'type': 'categorical',
        'label': 'Initial construct laterality',
        'name': 'construct_side_initial',
        'options': ['Bilateral', 'Unilateral'] as const,
    },
    'superior_attach_initial': {
        'type': 'categorical',
        'label': 'Superior anchor site',
        'name': 'superior_attach_initial',
        'options': ['Spine', 'Rib'] as const,
    },
    'num_superior_anchors_initial': {
        'type': 'continuous',
        'label': 'Number of superior anchors',
        'name': 'num_superior_anchors_initial',
        'units': 'anchors',
    },
    'inferior_attach_initial': {
        'type': 'categorical',
        'label': 'Inferior anchor site',
        'name': 'inferior_attach_initial',
        'options': ['Spine', 'Pelvis'] as const,
    },
};

const inputCategories: Record<CategoryKey, readonly InputKey[]> = {
    'Patient factors': ['age_at_insertion', 'height_pre', 'weight_pre', 'eos_type', 'amb_status_preop'],
    'Radiographic factors': ['major_cobb_angle_pre', 'minor_cobb_angle_pre', 'kyphosis_pre'],
    'Planned construct': ['construct_type_initial', 'construct_side_initial', 'superior_attach_initial', 'num_superior_anchors_initial', 'inferior_attach_initial'],
};

/** 4) Form values type: numbers for continuous, strings for categorical.
 *    (Allow '' to keep MUI TextField controlled for numbers before entry.) */
type ContinuousKeys =
    | "age_at_insertion"
    | "height_pre"
    | "weight_pre"
    | "major_cobb_angle_pre"
    | "minor_cobb_angle_pre"
    | "kyphosis_pre"
    | "num_superior_anchors_initial";
type CategoricalKeys = Exclude<InputKey, ContinuousKeys>;

type FormValues =
    & { [K in ContinuousKeys]: number | "" }
    & { [K in CategoricalKeys]: string };

const validationSchema = yup.object({
    construct_type_initial: yup.string().required("Required"),
    eos_type: yup.string().required("Required"),
    amb_status_preop: yup.string().required("Required"),
    age_at_insertion: yup.number().required("Required"),
    weight_pre: yup.number().required("Required"),
    height_pre: yup.number().required("Required"),
    major_cobb_angle_pre: yup.number().required("Required"),
    minor_cobb_angle_pre: yup.number().required("Required"),
    kyphosis_pre: yup.number().required("Required"),
    construct_side_initial: yup.string().required("Required"),
    superior_attach_initial: yup.string().required("Required"),
    num_superior_anchors_initial: yup.number().required("Required"),
    inferior_attach_initial: yup.string().required("Required"),
});

export function App() {
    const [result, setResult] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);

    const initialValues: FormValues = {
        construct_type_initial: '',
        eos_type: '',
        amb_status_preop: '',
        age_at_insertion: '',
        weight_pre: '',
        height_pre: '',
        major_cobb_angle_pre: '',
        minor_cobb_angle_pre: '',
        kyphosis_pre: '',
        construct_side_initial: '',
        superior_attach_initial: '',
        num_superior_anchors_initial: '',
        inferior_attach_initial: ''
    };

    // Helper to determine risk level color and label
    const getRiskLevel = (percentage: number) => {
        if (percentage < 20) return { color: 'success', label: 'Low Risk', bgColor: '#d1fae5' };
        if (percentage < 50) return { color: 'warning', label: 'Moderate Risk', bgColor: '#fef3c7' };
        return { color: 'error', label: 'High Risk', bgColor: '#fee2e2' };
    };

    // Category icons
    const categoryIcons: Record<CategoryKey, React.ReactElement> = {
        'Patient factors': <Person sx={{ fontSize: 28, color: '#2563eb' }} />,
        'Radiographic factors': <Straighten sx={{ fontSize: 28, color: '#8b5cf6' }} />,
        'Planned construct': <Build sx={{ fontSize: 28, color: '#10b981' }} />,
    };

    const oneHotEncode = (selectedValue: string, options: readonly string[]) => {
        const encoding = new Array(options.length).fill(0);
        encoding[options.indexOf(selectedValue)] = 1;
        return encoding;
    };

    const onSubmit= (values: FormValues) => {
        setIsCalculating(true);
        setResult('');

        const num = (v: number | "") => (v === "" ? 0 : v);

        const inputs: Record<string, ort.Tensor> = {

            construct_type_initial_MCGR: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_type_initial, (inputInfo['construct_type_initial'] as CategoricalField)['options'])[0]]), [1, 1]),
            construct_type_initial_TGR: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_type_initial, (inputInfo['construct_type_initial'] as CategoricalField)['options'])[1]]), [1, 1]),
            construct_type_initial_VEPTR: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_type_initial, (inputInfo['construct_type_initial'] as CategoricalField)['options'])[2]]), [1, 1]),

            eos_type_Congenital: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, (inputInfo['eos_type'] as CategoricalField)['options'])[0]]), [1, 1]),
            eos_type_Idiopathic: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, (inputInfo['eos_type'] as CategoricalField)['options'])[1]]), [1, 1]),
            eos_type_Neuromuscular: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, (inputInfo['eos_type'] as CategoricalField)['options'])[2]]), [1, 1]),
            eos_type_Syndromic: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.eos_type, (inputInfo['eos_type'] as CategoricalField)['options'])[3]]), [1, 1]),

            amb_status_preop_Ambulatory: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.amb_status_preop, (inputInfo['amb_status_preop'] as CategoricalField)['options'])[0]]), [1, 1]),
            amb_status_preop_Non_ambulatory: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.amb_status_preop, (inputInfo['amb_status_preop'] as CategoricalField)['options'])[1]]), [1, 1]),

            age_at_insertion: new ort.Tensor("float32", new Float32Array([num(values.age_at_insertion)]), [1, 1]),
            weight_pre: new ort.Tensor("float32", new Float32Array([num(values.weight_pre)]), [1, 1]),
            height_pre: new ort.Tensor("float32", new Float32Array([num(values.height_pre)]), [1, 1]),
            major_cobb_angle_pre: new ort.Tensor("float32", new Float32Array([num(values.major_cobb_angle_pre)]), [1, 1]),
            minor_cobb_angle_pre: new ort.Tensor("float32", new Float32Array([num(values.minor_cobb_angle_pre)]), [1, 1]),
            kyphosis_pre: new ort.Tensor("float32", new Float32Array([num(values.kyphosis_pre)]), [1, 1]),

            construct_side_initial_Bilateral: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_side_initial, (inputInfo['construct_side_initial'] as CategoricalField)['options'])[0]]), [1, 1]),
            construct_side_initial_Unilateral: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.construct_side_initial, (inputInfo['construct_side_initial'] as CategoricalField)['options'])[1]]), [1, 1]),

            superior_attach_initial_Spine: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.superior_attach_initial, (inputInfo['superior_attach_initial'] as CategoricalField)['options'])[0]]), [1, 1]),
            superior_attach_initial_Rib: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.superior_attach_initial, (inputInfo['superior_attach_initial'] as CategoricalField)['options'])[1]]), [1, 1]),

            num_superior_anchors_initial: new ort.Tensor("float32", new Float32Array([num(values.num_superior_anchors_initial)]), [1, 1]),

            inferior_attach_initial_Spine: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.inferior_attach_initial, (inputInfo['inferior_attach_initial'] as CategoricalField)['options'])[0]]), [1, 1]),
            inferior_attach_initial_Pelvis: new ort.Tensor("float32", new Float32Array([oneHotEncode(values.inferior_attach_initial, (inputInfo['inferior_attach_initial'] as CategoricalField)['options'])[1]]), [1, 1])
        };

        console.log(inputs);

        runModel(inputs)
    };

    const runModel= async (inputs: Record<string, ort.Tensor>) => {

        // WASM
        ort.env.wasm.wasmPaths = {
            'ort-wasm.wasm': '/ort-wasm.wasm',
        }

        try {
            // STEP 3: Load ONNX model
            const session = await ort.InferenceSession.create('/upror_growing.onnx');

            // STEP 5: Run model
            const output = await session.run(inputs);

            const probTensor = output["probabilities"];
            const probability = probTensor.data[1] as number; // assuming index 1 is 'UPROR'

            setResult((probability * 100).toFixed(0) + '%');

        } catch (err) {
            console.error("Error running ONNX model:", err);
            setResult('Error calculating risk');
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                py: 4
            }}>
                <Container maxWidth="md">
                    <Stack spacing={4}>
                        {/* Header Card */}
                        <Card elevation={8} sx={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            borderRadius: 3
                        }}>
                            <CardContent sx={{ p: 4 }}>
                                <Stack spacing={2} alignItems="center" textAlign="center">
                                    <Assessment sx={{ fontSize: 64, color: '#2563eb' }} />
                                    <Typography variant="h2" color="primary" sx={{
                                        background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>
                                        EOS UPROR Calculator
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                                        This calculator uses a logistic regression machine learning model to calculate an early-onset scoliosis (EOS) patient's risk of experiencing an unplanned return to the operating room (UPROR) over their treatment course.
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>

                        <Formik<FormValues>
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={onSubmit}
                        >
                            {({values, handleChange, handleBlur, errors, touched}) => (
                                <Form>
                                    <Stack spacing={3}>
                                        {/* Input Sections */}
                                        {(Object.keys(inputCategories) as CategoryKey[]).map((category) => (
                                            <Card
                                                key={category + '_card'}
                                                elevation={6}
                                                sx={{
                                                    borderRadius: 3,
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: 12,
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: 3 }}>
                                                    <Stack spacing={2.5}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                            {categoryIcons[category]}
                                                            <Typography variant="subtitle2" color="text.primary">
                                                                {category}
                                                            </Typography>
                                                        </Box>
                                                        <Divider />
                                                        <Stack spacing={2}>
                                                            {Object.values(inputCategories[category]).map((fieldID) => {
                                                                if (inputInfo[fieldID]['type'] === 'continuous') {
                                                                    return (
                                                                        <TextField
                                                                            label={inputInfo[fieldID]['label']}
                                                                            name={inputInfo[fieldID]['name']}
                                                                            key={inputInfo[fieldID]['name']}
                                                                            value={values[inputInfo[fieldID]['name']]}
                                                                            type={"number"}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched[inputInfo[fieldID]['name']] && Boolean(errors[inputInfo[fieldID]['name']])}
                                                                            helperText={touched[inputInfo[fieldID]['name']] && errors[inputInfo[fieldID]['name']]}
                                                                            fullWidth
                                                                            size="medium"
                                                                            slotProps={{
                                                                                input: {
                                                                                    endAdornment: <InputAdornment position={"end"}>{inputInfo[fieldID]['units']}</InputAdornment>,
                                                                                },
                                                                            }}
                                                                        />
                                                                    );
                                                                }

                                                                if (inputInfo[fieldID]['type'] === 'categorical') {
                                                                    return (
                                                                        <TextField
                                                                            label={inputInfo[fieldID]['label']}
                                                                            name={inputInfo[fieldID]['name']}
                                                                            key={inputInfo[fieldID]['name']}
                                                                            value={values[inputInfo[fieldID]['name']]}
                                                                            onChange={handleChange}
                                                                            onBlur={handleBlur}
                                                                            error={touched[inputInfo[fieldID]['name']] && Boolean(errors[inputInfo[fieldID]['name']])}
                                                                            helperText={touched[inputInfo[fieldID]['name']] && errors[inputInfo[fieldID]['name']]}
                                                                            select
                                                                            fullWidth
                                                                            size="medium"
                                                                        >
                                                                            {Object.values(inputInfo[fieldID]['options']).map((optionName) => (
                                                                                <MenuItem key={optionName} value={optionName}>{optionName}</MenuItem>
                                                                            ))}
                                                                        </TextField>
                                                                    );
                                                                }
                                                            })}
                                                        </Stack>
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        ))}

                                        {/* Calculate Button */}
                                        <Button
                                            variant="contained"
                                            type="submit"
                                            size="large"
                                            disabled={isCalculating}
                                            startIcon={<Calculate />}
                                            sx={{
                                                py: 1.5,
                                                background: 'linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #1e40af 0%, #6d28d9 100%)',
                                                    transform: 'scale(1.02)',
                                                },
                                                transition: 'all 0.2s',
                                                boxShadow: 4,
                                            }}
                                        >
                                            {isCalculating ? 'Calculating...' : 'Calculate UPROR Risk'}
                                        </Button>

                                        {/* Results Display */}
                                        {result && !isCalculating && (
                                            <Card
                                                elevation={8}
                                                sx={{
                                                    borderRadius: 3,
                                                    background: result !== 'Error calculating risk'
                                                        ? getRiskLevel(parseFloat(result)).bgColor
                                                        : '#fee2e2',
                                                    border: '2px solid',
                                                    borderColor: result !== 'Error calculating risk'
                                                        ? `${getRiskLevel(parseFloat(result)).color}.main`
                                                        : 'error.main',
                                                }}
                                            >
                                                <CardContent sx={{ p: 4 }}>
                                                    <Stack spacing={2} alignItems="center">
                                                        <Chip
                                                            label={result !== 'Error calculating risk'
                                                                ? getRiskLevel(parseFloat(result)).label
                                                                : 'Error'}
                                                            color={result !== 'Error calculating risk'
                                                                ? getRiskLevel(parseFloat(result)).color as 'success' | 'warning' | 'error'
                                                                : 'error'}
                                                            sx={{ fontSize: '0.9rem', fontWeight: 600, px: 2, py: 0.5 }}
                                                        />
                                                        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '3rem' }}>
                                                            {result}
                                                        </Typography>
                                                        <Typography variant="body1" color="text.secondary" fontWeight={500}>
                                                            Predicted UPROR Risk
                                                        </Typography>
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </Stack>
                                </Form>
                            )}
                        </Formik>
                    </Stack>
                </Container>
            </Box>
        </ThemeProvider>
    )
}
